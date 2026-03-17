namespace VideoGenerator.API.Models.Veo3;

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
    public string Provider { get; init; } = "google-ai-studio"; // "google-ai-studio" | "vertex-ai"
    public string? ImageBase64 { get; init; }
    public string? ImageMimeType { get; init; }
    public string? FirstFrameBase64 { get; init; }
    public string? FirstFrameMimeType { get; init; }
    public string? LastFrameBase64 { get; init; }
    public string? LastFrameMimeType { get; init; }
}
