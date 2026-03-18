using Microsoft.EntityFrameworkCore;
using VideoGenerator.API.Data;
using VideoGenerator.API.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// SQLite via EF Core
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=videogenerator.db"));

// Services
builder.Services.AddScoped<EncryptionService>();
builder.Services.AddHttpClient<Veo3Service>();
builder.Services.AddHttpClient<SoraService>();
builder.Services.AddHttpClient();

// CORS para o Electron/Angular
builder.Services.AddCors(options =>
{
    options.AddPolicy("ElectronApp", policy =>
        policy.WithOrigins("http://localhost:4200", "file://")
              .AllowAnyMethod()
              .AllowAnyHeader());
});

var app = builder.Build();

// Apply migrations on startup
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    dbContext.Database.EnsureCreated();
}

app.UseCors("ElectronApp");
app.UseAuthorization();
app.MapControllers();

app.Run();
