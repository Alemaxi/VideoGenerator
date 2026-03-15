using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using VideoGenerator.API.Data;
using VideoGenerator.API.Models;
using VideoGenerator.API.Services;

namespace VideoGenerator.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ApiKeysController(AppDbContext db, EncryptionService encryption) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var keys = await db.ApiKeys
            .Select(k => new
            {
                k.Id,
                k.Provider,
                k.Label,
                k.IsActive,
                k.CreatedAt,
                KeyPreview = k.KeyValue.Length > 8 ? k.KeyValue.Substring(0, 4) + "****" : "****"
            })
            .ToListAsync();

        return Ok(keys);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateApiKeyDto dto)
    {
        var apiKey = new ApiKey
        {
            Provider = dto.Provider.ToLower(),
            Label = dto.Label,
            KeyValue = encryption.Encrypt(dto.KeyValue),
            IsActive = true
        };

        db.ApiKeys.Add(apiKey);
        await db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetAll), new { id = apiKey.Id }, new { apiKey.Id, apiKey.Provider, apiKey.Label });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateApiKeyDto dto)
    {
        var key = await db.ApiKeys.FindAsync(id);
        if (key is null) return NotFound();

        if (dto.KeyValue is not null)
            key.KeyValue = encryption.Encrypt(dto.KeyValue);
        if (dto.Label is not null)
            key.Label = dto.Label;
        if (dto.IsActive.HasValue)
            key.IsActive = dto.IsActive.Value;

        key.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var key = await db.ApiKeys.FindAsync(id);
        if (key is null) return NotFound();

        db.ApiKeys.Remove(key);
        await db.SaveChangesAsync();

        return NoContent();
    }
}

public record CreateApiKeyDto(string Provider, string KeyValue, string? Label);
public record UpdateApiKeyDto(string? KeyValue, string? Label, bool? IsActive);
