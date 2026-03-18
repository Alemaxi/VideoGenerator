using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VideoGenerator.API.Data;
using VideoGenerator.API.Models;
using VideoGenerator.API.Models.Veo3;
using VideoGenerator.API.Services;

namespace VideoGenerator.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GenerationsController(
    AppDbContext db,
    Veo3Service veo3,
    SoraService sora,
    EncryptionService encryption,
    ILogger<GenerationsController> logger) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? type, [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var query = db.Generations.AsQueryable();

        if (type is not null)
            query = query.Where(g => g.Type == type);

        var total = await query.CountAsync();
        var items = await query
            .OrderByDescending(g => g.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return Ok(new { total, page, pageSize, items });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var gen = await db.Generations.FindAsync(id);
        return gen is null ? NotFound() : Ok(gen);
    }

    [HttpPost("video")]
    public async Task<IActionResult> GenerateVideo([FromBody] GenerateVideoRequest request)
    {
        var providerConfig = await ResolveProviderConfig(request.Provider);
        if (providerConfig is null)
            return BadRequest(new { error = $"No active API key found for provider '{request.Provider}'. Please add your key in Settings." });

        var model = request.Model ?? "veo-3.1-generate-preview";

        var generation = new Generation
        {
            Type = request.Mode,
            Provider = request.Provider,
            Model = model,
            Prompt = request.Prompt,
            NegativePrompt = request.NegativePrompt,
            DurationSeconds = request.DurationSeconds ?? 8,
            AspectRatio = request.AspectRatio ?? "16:9",
            Status = "processing"
        };

        db.Generations.Add(generation);
        await db.SaveChangesAsync();

        try
        {
            var operationName = request.Provider == "openai"
                ? await sora.GenerateVideoAsync(request, providerConfig)
                : await veo3.GenerateVideoAsync(request, providerConfig);
            generation.OperationName = operationName;
            await db.SaveChangesAsync();

            return Accepted(new { generation.Id, generation.Status, generation.OperationName });
        }
        catch (Exception ex)
        {
            generation.Status = "failed";
            generation.ErrorMessage = ex.Message;
            await db.SaveChangesAsync();
            logger.LogError(ex, "Video generation failed");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("{id}/check-status")]
    public async Task<IActionResult> CheckStatus(int id)
    {
        var generation = await db.Generations.FindAsync(id);
        if (generation is null) return NotFound();
        if (generation.OperationName is null) return BadRequest(new { error = "No operation to check" });

        var providerConfig = await ResolveProviderConfig(generation.Provider);
        if (providerConfig is null)
            return BadRequest(new { error = $"No active API key found for provider '{generation.Provider}'." });

        var status = generation.Provider == "openai"
            ? await sora.CheckOperationStatusAsync(generation.OperationName, providerConfig)
            : await veo3.CheckOperationStatusAsync(generation.OperationName, providerConfig);

        if (status.Done)
        {
            generation.Status = status.Error is not null ? "failed" : "completed";
            generation.ErrorMessage = status.Error;
            generation.CompletedAt = status.Error is null ? DateTime.UtcNow : null;
            generation.OutputPath = status.VideoUris?.FirstOrDefault();
            await db.SaveChangesAsync();
        }

        return Ok(new { generation.Id, generation.Status, generation.OutputPath, generation.ErrorMessage });
    }

    [HttpGet("{id}/download")]
    public async Task<IActionResult> Download(int id)
    {
        var generation = await db.Generations.FindAsync(id);
        if (generation is null) return NotFound();
        if (string.IsNullOrEmpty(generation.OutputPath))
            return BadRequest(new { error = "Vídeo ainda não disponível." });

        var providerConfig = await ResolveProviderConfig(generation.Provider);
        if (providerConfig is null)
            return BadRequest(new { error = "API key não encontrada." });

        string? downloadUrl;
        if (generation.Provider == "openai")
        {
            // Sora returns a direct CDN URL (pre-signed), no auth required
            downloadUrl = generation.OutputPath;
        }
        else if (generation.Provider == "vertex-ai")
        {
            downloadUrl = generation.OutputPath;
        }
        else
        {
            // Gemini Files API: outputPath may already contain ?alt=media
            downloadUrl = generation.OutputPath!.Contains('?')
                ? $"{generation.OutputPath}&key={providerConfig.ApiKey}"
                : $"{generation.OutputPath}?alt=media&key={providerConfig.ApiKey}";
        }

        logger.LogInformation("Downloading video from: {Url}", generation.OutputPath);

        using var req = new HttpRequestMessage(HttpMethod.Get, downloadUrl);
        if (generation.Provider is "vertex-ai" or "openai")
            req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", providerConfig.ApiKey);

        var httpClient = HttpContext.RequestServices.GetRequiredService<IHttpClientFactory>().CreateClient();
        var response = await httpClient.SendAsync(req, HttpCompletionOption.ResponseHeadersRead);

        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            logger.LogError("Download failed: {Status} - {Body}", response.StatusCode, body);
            return StatusCode((int)response.StatusCode, new { error = $"Falha ao baixar vídeo: {body}" });
        }

        var contentType = response.Content.Headers.ContentType?.MediaType ?? "video/mp4";
        var stream = await response.Content.ReadAsStreamAsync();
        var filename = $"video_{id}_{DateTime.UtcNow:yyyyMMdd}.mp4";

        return File(stream, contentType, filename);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var gen = await db.Generations.FindAsync(id);
        if (gen is null) return NotFound();

        db.Generations.Remove(gen);
        await db.SaveChangesAsync();

        return NoContent();
    }

    // --- Helpers ---

    private async Task<VeoProviderConfig?> ResolveProviderConfig(string provider)
    {
        var apiKey = await db.ApiKeys
            .Where(k => k.Provider == provider && k.IsActive)
            .FirstOrDefaultAsync();

        if (apiKey is null) return null;

        return new VeoProviderConfig
        {
            Provider = provider,
            ApiKey = encryption.Decrypt(apiKey.KeyValue),
            ProjectId = apiKey.ProjectId,
            Region = apiKey.Region
        };
    }
}
