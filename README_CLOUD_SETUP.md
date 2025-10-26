# WeChat Cloud Development Setup Guide

This guide explains how to set up WeChat Cloud Development for the application.

## Prerequisites

1. You must have a WeChat Mini Program account
2. You need to enable Cloud Development in the WeChat Mini Program backend

## Setup Steps

### 1. Create Cloud Environment

1. Log in to the [WeChat Mini Program Management Console](https://mp.weixin.qq.com/)
2. Navigate to "Development Management" > "Development Settings"
3. Find "Cloud Development" and click "Open Cloud Development"
4. Create a new cloud environment and note the Environment ID

### 2. Update Environment Configuration

In [app.js](file:///Users/kongzheng/workspace/zz/app.js), replace `'your-env-id'` with your actual cloud environment ID:

```javascript
wx.cloud.init({
  env: 'your-actual-env-id', // Replace with your environment ID
  traceUser: true
})
```

### 3. Deploy Cloud Functions

1. Open the WeChat Developer Tool
2. In the "Cloud Development" panel, create a new cloud environment
3. Right-click on the `cloudfunctions` folder in your project
4. Select "Upload and Deploy All Cloud Functions"

### 4. Create Database Collections

1. In the WeChat Developer Tool, open the "Cloud Development" panel
2. Go to the "Database" tab
3. Create a new collection named `users`

## Cloud Functions

This project includes two cloud functions:

1. `saveUserInfo` - Saves or updates user information in the cloud database
2. `getUserInfo` - Retrieves user information from the cloud database

## Testing

After completing the setup:

1. Restart the WeChat Developer Tool
2. Navigate to the "Me" page
3. Click "获取用户信息" to grant permissions
4. User data should now be stored in the cloud database instead of local storage

## Troubleshooting

If you encounter issues:

1. Ensure your cloud environment ID is correct
2. Check that cloud functions are deployed successfully
3. Verify the `users` collection exists in the database
4. Make sure you're using a supported version of the WeChat Developer Tool