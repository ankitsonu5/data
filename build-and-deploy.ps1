# Build and Deploy Script for Document Management System
# This script builds the Angular frontend and deploys it to the correct location

Write-Host "Starting build and deployment process..." -ForegroundColor Green

# Step 1: Navigate to frontend directory
Write-Host "Navigating to frontend directory..." -ForegroundColor Yellow
Set-Location -Path "frontend"

# Step 2: Build Angular application
Write-Host "Building Angular application..." -ForegroundColor Yellow
ng build --configuration production

# Step 3: Navigate back to root
Write-Host "Navigating back to root directory..." -ForegroundColor Yellow
Set-Location -Path ".."

# Step 4: Check if build files exist in nested browser folder
if (Test-Path "public/browser/browser") {
    Write-Host "Moving build files to correct location..." -ForegroundColor Yellow

    # Move files from nested browser folder to parent
    Move-Item -Path "public/browser/browser/*" -Destination "public/browser/" -Force

    # Remove empty nested folder
    Remove-Item -Path "public/browser/browser" -Recurse -Force

    Write-Host "Build files moved successfully!" -ForegroundColor Green
} else {
    Write-Host "Build files are already in correct location!" -ForegroundColor Green
}

# Step 5: Verify deployment
if (Test-Path "public/browser/index.html") {
    Write-Host "Deployment successful! Files are ready to serve." -ForegroundColor Green
    Write-Host "Your application is available at: http://localhost:3000" -ForegroundColor Cyan
} else {
    Write-Host "Deployment failed! index.html not found." -ForegroundColor Red
    exit 1
}

# Step 6: Display file summary
Write-Host ""
Write-Host "Deployed Files:" -ForegroundColor Cyan
Get-ChildItem -Path "public/browser" -File | ForEach-Object {
    $size = [math]::Round($_.Length / 1KB, 2)
    Write-Host "   $($_.Name) ($size KB)" -ForegroundColor White
}

Write-Host ""
Write-Host "Build and deployment completed successfully!" -ForegroundColor Green
Write-Host "To start the server, run: npm run dev" -ForegroundColor Yellow
