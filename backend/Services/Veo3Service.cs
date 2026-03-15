using System.Text;
using System.Text.Json;

namespace VideoGenerator.API.Services;

public class Veo3Service(HttpClient httpClient, ILogger<Veo3Service> logger)
{
    private const string BaseUrl = "https://generativelanguage.googleapis.com/v1beta";
    private const string DefaultModel = "veo-3.0-generate-preview";

    public async Task<string> GenerateVideoAsync(GenerateVideoRequest request, string apiKey)
    {
        var model = request.Model ?? DefaultModel;
        var url = $"{BaseUrl}/models/{model}:predictLongRunning?key={apiKey}";

        object instance = request.Mode switch
        {
            "image-to-video" => new
            {
                prompt = request.Prompt,
                image = new
                {
                    bytesBase64Encoded = request.ImageBase64,
                    mimeType = request.ImageMimeType ?? "image/jpeg"
                },
                durationSeconds = request.DurationSeconds ?? 8,
                aspectRatio = request.AspectRatio ?? "16:9",
                generateAudio = request.GenerateAudio ?? true
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
                },
                durationSeconds = request.DurationSeconds ?? 8,
                aspectRatio = request.AspectRatio ?? "16:9",
                generateAudio = request.GenerateAudio ?? true
            },
            _ => (object)new // text-to-video (default)
            {
                prompt = request.Prompt,
                negativePrompt = request.NegativePrompt,
                durationSeconds = request.DurationSeconds ?? 8,
                aspectRatio = request.AspectRatio ?? "16:9",
                enhancePrompt = request.EnhancePrompt ?? true,
                generateAudio = request.GenerateAudio ?? true
            }
        };

        var payload = new
        {
            instances = new[] { instance },
            parameters = new { storageUri = request.StorageUri }
        };

        var json = JsonSerializer.Serialize(payload);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        logger.LogInformation("Starting VEO 3 [{Mode}] generation for prompt: {Prompt}",
            request.Mode, request.Prompt[..Math.Min(50, request.Prompt.Length)]);

        var response = await httpClient.PostAsync(url, content);
        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            logger.LogError("VEO 3 API error: {Status} - {Body}", response.StatusCode, responseBody);
            throw new HttpRequestException($"VEO 3 API error: {response.StatusCode} - {responseBody}");
        }

        using var doc = JsonDocument.Parse(responseBody);
        var operationName = doc.RootElement.GetProperty("name").GetString()
            ?? throw new InvalidOperationException("Operation name not found in response");

        return operationName;
    }

    public async Task<OperationStatus> CheckOperationStatusAsync(string operationName, string apiKey)
    {
        var url = $"{BaseUrl}/{operationName}?key={apiKey}";

        var response = await httpClient.GetAsync(url);
        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"Status check error: {response.StatusCode} - {responseBody}");

        using var doc = JsonDocument.Parse(responseBody);
        var root = doc.RootElement;

        var done = root.TryGetProperty("done", out var doneEl) && doneEl.GetBoolean();

        if (!done)
            return new OperationStatus { Done = false };

        if (root.TryGetProperty("error", out var errorEl))
            return new OperationStatus { Done = true, Error = errorEl.GetRawText() };

        var videos = new List<string>();
        if (root.TryGetProperty("response", out var responseEl) &&
            responseEl.TryGetProperty("videos", out var videosEl))
        {
            foreach (var video in videosEl.EnumerateArray())
            {
                if (video.TryGetProperty("uri", out var uriEl))
                    videos.Add(uriEl.GetString() ?? string.Empty);
            }
        }

        return new OperationStatus { Done = true, VideoUris = videos };
    }
}

public record GenerateVideoRequest
{
    public string Prompt { get; init; } = string.Empty;
    public string? NegativePrompt { get; init; }
    public string? Model { get; init; }
    public int? DurationSeconds { get; init; }
    public string? AspectRatio { get; init; }
    public bool? EnhancePrompt { get; init; }
    public bool? GenerateAudio { get; init; }
    public string? StorageUri { get; init; }
    public string Mode { get; init; } = "text-to-video"; // "text-to-video" | "image-to-video" | "first-last-frame"
    public string? ImageBase64 { get; init; }
    public string? ImageMimeType { get; init; }
    public string? FirstFrameBase64 { get; init; }
    public string? FirstFrameMimeType { get; init; }
    public string? LastFrameBase64 { get; init; }
    public string? LastFrameMimeType { get; init; }
}

public record OperationStatus
{
    public bool Done { get; init; }
    public List<string>? VideoUris { get; init; }
    public string? Error { get; init; }
}
