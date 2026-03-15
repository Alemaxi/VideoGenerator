using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VideoGenerator.API.Data;
using VideoGenerator.API.Models;
using VideoGenerator.API.Services;

namespace VideoGenerator.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class GenerationsController(
    AppDbContext db,
    Veo3Service veo3,
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
        var apiKey = await db.ApiKeys
            .Where(k => k.Provider == "google" && k.IsActive)
            .FirstOrDefaultAsync();

        if (apiKey is null)
            return BadRequest(new { error = "No active Google API key found. Please add your API key in Settings." });

        var decryptedKey = encryption.Decrypt(apiKey.KeyValue);

        var generation = new Generation
        {
            Type = "video",
            Provider = "google",
            Model = request.Model ?? "veo-3.0-generate-preview",
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
            var operationName = await veo3.GenerateVideoAsync(request, decryptedKey);
            generation.OperationName = operationName;
            generation.Status = "processing";
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

        var apiKey = await db.ApiKeys
            .Where(k => k.Provider == "google" && k.IsActive)
            .FirstOrDefaultAsync();

        if (apiKey is null) return BadRequest(new { error = "No active Google API key found." });

        var decryptedKey = encryption.Decrypt(apiKey.KeyValue);

        var status = await veo3.CheckOperationStatusAsync(generation.OperationName, decryptedKey);

        if (status.Done)
        {
            if (status.Error is not null)
            {
                generation.Status = "failed";
                generation.ErrorMessage = status.Error;
            }
            else
            {
                generation.Status = "completed";
                generation.CompletedAt = DateTime.UtcNow;
                generation.OutputPath = status.VideoUris?.FirstOrDefault();
            }
            await db.SaveChangesAsync();
        }

        return Ok(new { generation.Id, generation.Status, generation.OutputPath, generation.ErrorMessage });
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
}
