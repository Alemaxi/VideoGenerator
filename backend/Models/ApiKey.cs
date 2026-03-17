namespace VideoGenerator.API.Models;

public class ApiKey
{
    public int Id { get; set; }
    public string Provider { get; set; } = string.Empty; // "google-ai-studio" | "vertex-ai"
    public string KeyValue { get; set; } = string.Empty; // encrypted
    public string? Label { get; set; }
    public string? ProjectId { get; set; } // Vertex AI only
    public string? Region { get; set; }    // Vertex AI only (default: us-central1)
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
