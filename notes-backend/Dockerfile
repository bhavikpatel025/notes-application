# Use the official .NET SDK image to build the app
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy the project files and restore dependencies
COPY ["Notes.Api/Notes.Api.csproj", "Notes.Api/"]
COPY ["Notes.Application/Notes.Application.csproj", "Notes.Application/"]
COPY ["Notes.Domain/Notes.Domain.csproj", "Notes.Domain/"]
COPY ["Notes.Infrastructure/Notes.Infrastructure.csproj", "Notes.Infrastructure/"]
RUN dotnet restore "Notes.Api/Notes.Api.csproj"

# Copy the rest of the code and build
COPY . .
WORKDIR "/src/Notes.Api"
RUN dotnet build "Notes.Api.csproj" -c Release -o /app/build

# Publish the app
FROM build AS publish
RUN dotnet publish "Notes.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Use the official ASP.NET Core runtime image to run the app
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=publish /app/publish .

# Render dynamically assigns a port, ASP.NET Core 8+ listens on 8080 by default
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "Notes.Api.dll"]
