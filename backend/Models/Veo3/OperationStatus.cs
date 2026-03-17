namespace VideoGenerator.API.Models.Veo3;

public record OperationStatus
{
    public bool Done { get; init; }
    public List<string>? VideoUris { get; init; }
    public string? Error { get; init; }
}
