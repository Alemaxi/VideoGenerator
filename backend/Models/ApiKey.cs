namespace VideoGenerator.API.Models;

public class ApiKey
{
    public int Id { get; set; }
    public string Provider { get; set; } = string.Empty; // "google", "openai", etc.
    public string KeyValue { get; set; } = string.Empty; // encrypted
    public string? Label { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}
