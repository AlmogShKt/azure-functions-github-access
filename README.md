# GitHub Repository Access Function

A modern Azure Function v4 application that automates GitHub repository access requests using TypeScript.

## 🚀 Features

- **Automated GitHub Invitations**: Automatically invite users to your GitHub repository
- **Azure Table Storage**: Track invitation status and user details
- **Modern UI**: Beautiful HTML form for access requests
- **TypeScript**: Full type safety with Azure Functions v4 programming model
- **Idempotent**: Prevents duplicate invitations

## 🏗️ Architecture

- **Azure Function v4**: Serverless backend with TypeScript
- **GitHub API**: Manage repository collaborators via Octokit
- **Azure Table Storage**: Store invitation records
- **HTML Form**: User-friendly interface for access requests

## 📋 Prerequisites

- Node.js 18+
- Azure Functions Core Tools v4
- Azure Storage Account
- GitHub Personal Access Token with repository administration permissions

## 🛠️ Setup

### 1. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 2. Configure Environment Variables

Create a \`local.settings.json\` file (not included in git):

\`\`\`json
{
"IsEncrypted": false,
"Values": {
"FUNCTIONS_WORKER_RUNTIME": "node",
"AzureWebJobsStorage": "UseDevelopmentStorage=true",
"GITHUB_TOKEN": "your-github-token",
"GH_OWNER": "your-github-username",
"GH_REPO": "your-repository-name",
"GH_PERMISSION": "pull",
"TABLE_CONN": "your-azure-storage-connection-string",
"TABLE_NAME": "Entitlements"
}
}
\`\`\`

### 3. Build and Run Locally

\`\`\`bash
npm run build
npm start
\`\`\`

The function will be available at: \`http://localhost:7071/api/request-access\`

## 🌐 Deployment

### Deploy to Azure

\`\`\`bash
npm run build
func azure functionapp publish your-function-app-name
\`\`\`

### Set Azure Environment Variables

\`\`\`bash
az functionapp config appsettings set \\
--name your-function-app-name \\
--resource-group your-resource-group \\
--settings \\
GITHUB_TOKEN="your-token" \\
GH_OWNER="your-username" \\
GH_REPO="your-repo" \\
TABLE_CONN="your-connection-string"
\`\`\`

## 📝 Usage

### API Endpoint

**POST** \`/api/request-access\`

**Request Body:**
\`\`\`json
{
"email": "user@example.com",
"github_username": "username",
"permission": "pull"
}
\`\`\`

**Permission Levels:**

- \`pull\` - Read-only access (default)
- \`triage\` - Read + Issues
- \`push\` - Read + Write
- \`maintain\` - Read + Write + Settings
- \`admin\` - Full access

### HTML Form

Open \`request-access-form.html\` in a browser for a user-friendly interface.

## 🔧 GitHub Token Setup

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Create a new token with these permissions:
   - **Repository access**: All repositories (or specific repositories)
   - **Administration**: Read and write
3. Copy the token and add it to your environment variables

## 📊 Data Storage

The function stores invitation records in Azure Table Storage with:

- **PartitionKey**: Repository name
- **RowKey**: GitHub username
- **Status**: pending | invited | active | revoked | expired
- **Email**: User's email address
- **Permission**: Granted permission level
- **Timestamps**: Created and updated dates

## 🛡️ Security

- GitHub token is stored securely in Azure Key Vault or App Settings
- Local settings file is excluded from git
- Function uses anonymous authentication (consider adding your own auth layer)

## 🚀 Live Example

- **Function URL**: \`https://your-function-app.azurewebsites.net/api/request-access\`
- **Form**: Host the HTML form on any web server

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For issues and questions, please create an issue in this repository.
