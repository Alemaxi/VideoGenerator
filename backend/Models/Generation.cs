namespace VideoGenerator.API.Models;

public class Generation
{
    public int Id { get; set; }
    public string Type { get; set; } = string.Empty; // "text-to-video" | "image-to-video" | "first-last-frame"
    public string Provider { get; set; } = "google";
    public string Model { get; set; } = "veo-3.0-generate-preview";
    public string Prompt { get; set; } = string.Empty;
    public string? NegativePrompt { get; set; }
    public string Status { get; set; } = "pending"; // pending | processing | completed | failed
    public string? OutputPath { get; set; }
    public string? ThumbnailPath { get; set; }
    public string? ErrorMessage { get; set; }
    public string? OperationName { get; set; } // Google long-running operation name
    public int? DurationSeconds { get; set; }
    public string? AspectRatio { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
}
