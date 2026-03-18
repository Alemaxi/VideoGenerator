using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using VideoGenerator.API.Models.Veo3;

namespace VideoGenerator.API.Services;

public class SoraService(HttpClient httpClient, ILogger<SoraService> logger)
{
    private const string BaseUrl = "https://api.openai.com/v1/videos";

    public async Task<string> GenerateVideoAsync(GenerateVideoRequest request, VeoProviderConfig config)
    {
        var model = request.Model ?? "sora-2";
        var size = AspectRatioToSize(request.AspectRatio ?? "16:9");
        var seconds = (request.DurationSeconds ?? 8).ToString();

        logger.LogInformation("Sora [{Model}] [{Mode}] starting: {Prompt}", model, request.Mode, request.Prompt[..Math.Min(50, request.Prompt.Length)]);

        HttpContent content = request.Mode == "image-to-video" && !string.IsNullOrEmpty(request.ImageBase64)
            ? BuildMultipartContent(request, model, size, seconds)
            : BuildJsonContent(request, model, size, seconds);

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, BaseUrl) { Content = content };
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", config.ApiKey);

        var response = await httpClient.SendAsync(httpRequest);
        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            logger.LogError("Sora API error: {Status} - {Body}", response.StatusCode, responseBody);
            throw new HttpRequestException($"Sora API error ({response.StatusCode}): {responseBody}");
        }

        using var doc = JsonDocument.Parse(responseBody);
        return doc.RootElement.GetProperty("id").GetString()
            ?? throw new InvalidOperationException("Job ID not found in Sora response");
    }

    public async Task<OperationStatus> CheckOperationStatusAsync(string jobId, VeoProviderConfig config)
    {
        using var httpRequest = new HttpRequestMessage(HttpMethod.Get, $"{BaseUrl}/{jobId}");
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", config.ApiKey);

        var response = await httpClient.SendAsync(httpRequest);
        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"Sora status check error ({response.StatusCode}): {responseBody}");

        using var doc = JsonDocument.Parse(responseBody);
        var root = doc.RootElement;

        var status = root.TryGetProperty("status", out var statusEl) ? statusEl.GetString() : null;

        if (status is "failed" or "expired")
        {
            var errorMsg = root.TryGetProperty("error", out var errEl) ? errEl.GetRawText() : $"Job {status}";
            return new OperationStatus { Done = true, Error = errorMsg };
        }

        if (status != "completed")
            return new OperationStatus { Done = false };

        // Download via /videos/{id}/content with Bearer auth
        return new OperationStatus { Done = true, VideoUris = [$"{BaseUrl}/{jobId}/content"] };
    }

    // --- Helpers ---

    private static StringContent BuildJsonContent(GenerateVideoRequest request, string model, string size, string seconds)
    {
        var payload = new Dictionary<string, object>
        {
            ["model"]   = model,
            ["prompt"]  = request.Prompt,
            ["size"]    = size,
            ["seconds"] = seconds
        };
        return new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
    }

    private static MultipartFormDataContent BuildMultipartContent(GenerateVideoRequest request, string model, string size, string seconds)
    {
        var form = new MultipartFormDataContent
        {
            { new StringContent(model),   "model" },
            { new StringContent(request.Prompt), "prompt" },
            { new StringContent(size),    "size" },
            { new StringContent(seconds), "seconds" },
        };

        var imageBytes = Convert.FromBase64String(request.ImageBase64!);
        var imageContent = new ByteArrayContent(imageBytes);
        imageContent.Headers.ContentType = MediaTypeHeaderValue.Parse(request.ImageMimeType ?? "image/jpeg");
        form.Add(imageContent, "input_reference", "image");

        return form;
    }

    private static string AspectRatioToSize(string aspectRatio) =>
        aspectRatio.Contains('x') ? aspectRatio : aspectRatio switch
        {
            "9:16" => "720x1280",
            _      => "1280x720"  // 16:9 default
        };
}
