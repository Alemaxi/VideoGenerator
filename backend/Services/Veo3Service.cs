using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using VideoGenerator.API.Models.Veo3;


namespace VideoGenerator.API.Services;

public class Veo3Service(HttpClient httpClient, ILogger<Veo3Service> logger)
{
    private const string DefaultModel = "veo-3.1-generate-preview";
    private const string AiStudioBaseUrl = "https://generativelanguage.googleapis.com/v1beta";
    private const string VertexBaseUrl = "https://{region}-aiplatform.googleapis.com/v1";

    public async Task<string> GenerateVideoAsync(GenerateVideoRequest request, VeoProviderConfig config)
    {
        var model = request.Model ?? DefaultModel;
        var payload = BuildPayload(request);
        var json = JsonSerializer.Serialize(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var url = config.Provider == "vertex-ai"
            ? BuildVertexUrl(config, model, "predictLongRunning")
            : $"{AiStudioBaseUrl}/models/{model}:predictLongRunning?key={config.ApiKey}";

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, url) { Content = content };
        ApplyAuth(httpRequest, config);

        logger.LogInformation("VEO [{Provider}] [{Mode}] starting: {Prompt}",
            config.Provider, request.Mode, request.Prompt[..Math.Min(50, request.Prompt.Length)]);

        var response = await httpClient.SendAsync(httpRequest);
        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            logger.LogError("VEO API error: {Status} - {Body}", response.StatusCode, responseBody);
            throw new HttpRequestException($"VEO API error ({response.StatusCode}): {responseBody}");
        }

        using var doc = JsonDocument.Parse(responseBody);
        return doc.RootElement.GetProperty("name").GetString()
            ?? throw new InvalidOperationException("Operation name not found in response");
    }

    public async Task<OperationStatus> CheckOperationStatusAsync(string operationName, VeoProviderConfig config)
    {
        var url = config.Provider == "vertex-ai"
            ? $"{BuildVertexBaseUrl(config)}/{operationName}"
            : $"{AiStudioBaseUrl}/{operationName}?key={config.ApiKey}";

        using var httpRequest = new HttpRequestMessage(HttpMethod.Get, url);
        ApplyAuth(httpRequest, config);

        var response = await httpClient.SendAsync(httpRequest);
        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"Status check error ({response.StatusCode}): {responseBody}");

        using var doc = JsonDocument.Parse(responseBody);
        var root = doc.RootElement;

        if (!root.TryGetProperty("done", out var doneEl) || !doneEl.GetBoolean())
            return new OperationStatus { Done = false };

        if (root.TryGetProperty("error", out var errorEl))
            return new OperationStatus { Done = true, Error = errorEl.GetRawText() };

        var videos = new List<string>();

        if (root.TryGetProperty("response", out var responseEl))
        {
            // Gemini API format: response.generateVideoResponse.generatedSamples[].video.uri
            if (responseEl.TryGetProperty("generateVideoResponse", out var gvrEl) &&
                gvrEl.TryGetProperty("generatedSamples", out var samplesEl))
            {
                foreach (var sample in samplesEl.EnumerateArray())
                {
                    if (sample.TryGetProperty("video", out var videoEl) &&
                        videoEl.TryGetProperty("uri", out var uriEl))
                        videos.Add(uriEl.GetString() ?? string.Empty);
                }
            }
            // Vertex AI format: response.videos[].uri
            else if (responseEl.TryGetProperty("videos", out var videosEl))
            {
                foreach (var video in videosEl.EnumerateArray())
                {
                    if (video.TryGetProperty("uri", out var uriEl))
                        videos.Add(uriEl.GetString() ?? string.Empty);
                }
            }
        }

        return new OperationStatus { Done = true, VideoUris = videos };
    }

    // --- Helpers ---

    private static object BuildPayload(GenerateVideoRequest request)
    {
        // Only prompt + media go inside instances
        object instance = request.Mode switch
        {
            "image-to-video" => new
            {
                prompt = request.Prompt,
                image = new
                {
                    bytesBase64Encoded = request.ImageBase64,
                    mimeType = request.ImageMimeType ?? "image/jpeg"
                }
            },
            "first-last-frame" => new
            {
                prompt = request.Prompt,
                firstFrame = new
                {
                    bytesBase64Encoded = request.FirstFrameBase64,
                    mimeType = request.FirstFrameMimeType ?? "image/jpeg"
                },
                lastFrame = new
                {
                    bytesBase64Encoded = request.LastFrameBase64,
                    mimeType = request.LastFrameMimeType ?? "image/jpeg"
                }
            },
            _ => (object)new { prompt = request.Prompt }
        };

        // Build parameters only with supported, non-null fields
        var parameters = new Dictionary<string, object>
        {
            ["aspectRatio"] = request.AspectRatio ?? "16:9",
            ["durationSeconds"] = request.DurationSeconds ?? 8
        };

        if (!string.IsNullOrEmpty(request.NegativePrompt))
            parameters["negativePrompt"] = request.NegativePrompt;

        if (!string.IsNullOrEmpty(request.StorageUri))
            parameters["storageUri"] = request.StorageUri;

        return new
        {
            instances = new[] { instance },
            parameters
        };
    }

    private static string BuildVertexBaseUrl(VeoProviderConfig config)
    {
        var region = config.Region ?? "us-central1";
        return VertexBaseUrl.Replace("{region}", region);
    }

    private static string BuildVertexUrl(VeoProviderConfig config, string model, string action)
    {
        var baseUrl = BuildVertexBaseUrl(config);
        var region = config.Region ?? "us-central1";
        return $"{baseUrl}/projects/{config.ProjectId}/locations/{region}/publishers/google/models/{model}:{action}";
    }

    private static void ApplyAuth(HttpRequestMessage request, VeoProviderConfig config)
    {
        if (config.Provider == "vertex-ai")
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", config.ApiKey);
    }
}

