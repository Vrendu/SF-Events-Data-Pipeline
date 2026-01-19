# GitHub Repository Setup Guide

Follow these steps to push your project to GitHub.

## Step 1: Initialize Git Repository

```bash
cd /Users/vamshirenduchintala/Desktop/Projects/sf-events-app
git init
```

## Step 2: Add All Files

```bash
git add .
```

## Step 3: Create Initial Commit

```bash
git commit -m "Initial commit: Events scraper backend with PostgreSQL"
```

## Step 4: Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository (e.g., `sf-events-app`)
3. **Do NOT** initialize with README, .gitignore, or license (we already have these)
4. Copy the repository URL

## Step 5: Add Remote and Push

```bash
# Add remote (replace with your actual GitHub username and repo name)
git remote add origin https://github.com/YOUR_USERNAME/sf-events-app.git

# Or if using SSH:
# git remote add origin git@github.com:YOUR_USERNAME/sf-events-app.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## Alternative: Using GitHub CLI

If you have GitHub CLI installed:

```bash
gh repo create sf-events-app --public --source=. --remote=origin --push
```

## Verify

Visit your repository on GitHub to confirm all files were pushed successfully.

## Next Steps

- Add a description to your GitHub repository
- Consider adding topics/tags (e.g., `python`, `fastapi`, `web-scraping`, `postgresql`)
- Set up GitHub Actions for CI/CD (optional)
- Add a LICENSE file if needed
