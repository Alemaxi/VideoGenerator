namespace VideoGenerator.API.Models.Veo3;

public record VeoProviderConfig
{
    public string Provider { get; init; } = "google-ai-studio"; // "google-ai-studio" | "vertex-ai"
    public string ApiKey { get; init; } = string.Empty;
    public string? ProjectId { get; init; } // Vertex AI only
    public string? Region { get; init; }    // Vertex AI only (default: us-central1)
}
