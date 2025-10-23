const { app } = require('@azure/functions');

app.http('RepoAccessRequest', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        context.log(`Repository access request processed for url "${request.url}"`);

        try {
            if (request.method === 'GET') {
                // Return a simple HTML form for repository access requests
                const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Repository Access Request</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
            color: #555;
        }
        input, textarea, select {
            width: 100%;
            padding: 10px;
            border: 2px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
            box-sizing: border-box;
        }
        input:focus, textarea:focus, select:focus {
            border-color: #0078d4;
            outline: none;
        }
        textarea {
            height: 100px;
            resize: vertical;
        }
        button {
            background-color: #0078d4;
            color: white;
            padding: 12px 30px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            width: 100%;
        }
        button:hover {
            background-color: #106ebe;
        }
        .success {
            color: #4caf50;
            background: #e8f5e8;
            padding: 15px;
            border-radius: 4px;
            margin: 10px 0;
            display: none;
        }
        .error {
            color: #f44336;
            background: #ffeaea;
            padding: 15px;
            border-radius: 4px;
            margin: 10px 0;
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔐 Repository Access Request</h1>
        <div id="success" class="success"></div>
        <div id="error" class="error"></div>
        
        <form id="accessForm">
            <div class="form-group">
                <label for="requesterName">Your Name *</label>
                <input type="text" id="requesterName" name="requesterName" required>
            </div>
            
            <div class="form-group">
                <label for="email">Email Address *</label>
                <input type="email" id="email" name="email" required>
            </div>
            
            <div class="form-group">
                <label for="githubUsername">GitHub Username</label>
                <input type="text" id="githubUsername" name="githubUsername">
            </div>
            
            <div class="form-group">
                <label for="repositoryName">Repository Name *</label>
                <input type="text" id="repositoryName" name="repositoryName" required>
            </div>
            
            <div class="form-group">
                <label for="accessLevel">Access Level *</label>
                <select id="accessLevel" name="accessLevel" required>
                    <option value="">Select access level</option>
                    <option value="read">Read (view only)</option>
                    <option value="write">Write (read + contribute)</option>
                    <option value="admin">Admin (full access)</option>
                </select>
            </div>
            
            <div class="form-group">
                <label for="justification">Justification *</label>
                <textarea id="justification" name="justification" placeholder="Please explain why you need access to this repository..." required></textarea>
            </div>
            
            <button type="submit">Submit Request</button>
        </form>
    </div>

    <script>
        document.getElementById('accessForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            
            const successDiv = document.getElementById('success');
            const errorDiv = document.getElementById('error');
            
            // Hide previous messages
            successDiv.style.display = 'none';
            errorDiv.style.display = 'none';
            
            try {
                const response = await fetch(window.location.href, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    successDiv.textContent = result.message || 'Request submitted successfully!';
                    successDiv.style.display = 'block';
                    this.reset();
                } else {
                    errorDiv.textContent = result.error || 'Failed to submit request';
                    errorDiv.style.display = 'block';
                }
            } catch (error) {
                errorDiv.textContent = 'Network error: ' + error.message;
                errorDiv.style.display = 'block';
            }
        });
    </script>
</body>
</html>`;
                
                return {
                    status: 200,
                    headers: {
                        'Content-Type': 'text/html; charset=utf-8'
                    },
                    body: html
                };
            }
            
            if (request.method === 'POST') {
                // Process the repository access request
                const requestBody = await request.json();
                
                // Validate required fields
                const requiredFields = ['requesterName', 'email', 'repositoryName', 'accessLevel', 'justification'];
                const missingFields = requiredFields.filter(field => !requestBody[field]);
                
                if (missingFields.length > 0) {
                    return {
                        status: 400,
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            error: \`Missing required fields: \${missingFields.join(', ')}\`
                        })
                    };
                }
                
                // Log the request details
                context.log('Repository access request received:', {
                    requesterName: requestBody.requesterName,
                    email: requestBody.email,
                    githubUsername: requestBody.githubUsername,
                    repositoryName: requestBody.repositoryName,
                    accessLevel: requestBody.accessLevel,
                    justification: requestBody.justification,
                    timestamp: new Date().toISOString()
                });
                
                // Here you would typically:
                // 1. Store the request in a database
                // 2. Send email notifications to administrators
                // 3. Create tickets in your ticketing system
                // 4. Integrate with GitHub API for automatic approvals
                
                // For now, we'll just return a success response
                return {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: \`Access request for repository '\${requestBody.repositoryName}' has been submitted successfully. You will receive an email notification once the request is processed.\`,
                        requestId: \`REQ-\${Date.now()}\`,
                        timestamp: new Date().toISOString()
                    })
                };
            }
            
        } catch (error) {
            context.log.error('Error processing repository access request:', error);
            
            return {
                status: 500,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    error: 'Internal server error occurred while processing your request'
                })
            };
        }
    }
});
