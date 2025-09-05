# Angular Build Fix Script
# This script builds Angular and ensures files are in correct location

Write-Host "Starting Angular Build Process..." -ForegroundColor Cyan

# Step 1: Clean existing build
Write-Host "Cleaning existing build..." -ForegroundColor Yellow
if (Test-Path "public/browser") {
    Remove-Item -Path "public/browser" -Recurse -Force
    Write-Host "Cleaned existing build files" -ForegroundColor Green
}

# Step 2: Build Angular application
Write-Host "Building Angular application..." -ForegroundColor Yellow
Set-Location frontend
ng build --configuration production
Set-Location ..

# Step 3: Check if files are nested
if (Test-Path "public/browser/browser") {
    Write-Host "Files are nested, fixing..." -ForegroundColor Yellow

    # Move files from nested location
    Move-Item -Path "public/browser/browser/*" -Destination "public/browser/" -Force

    # Remove empty nested directory
    Remove-Item -Path "public/browser/browser" -Recurse -Force

    Write-Host "Fixed nested file structure" -ForegroundColor Green
} else {
    Write-Host "Files are in correct location" -ForegroundColor Green
}

# Step 4: Verify build
if (Test-Path "public/browser/index.html") {
    Write-Host "Build completed successfully!" -ForegroundColor Green
    Write-Host "Files location: public/browser/" -ForegroundColor Cyan

    # List main files
    Write-Host "Build files:" -ForegroundColor Cyan
    Get-ChildItem "public/browser" -Name | Where-Object { $_ -match '\.(html|js|css)$' } | ForEach-Object {
        Write-Host "   - $_" -ForegroundColor White
    }
} else {
    Write-Host "Build failed - index.html not found" -ForegroundColor Red
    exit 1
}

Write-Host "Ready to serve application!" -ForegroundColor Green
