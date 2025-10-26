# Cloud Database Setup for Trade Records

This guide explains how to set up the cloud database for storing trade records in the application.

## Prerequisites

1. You must have a WeChat Mini Program account
2. You need to enable Cloud Development in the WeChat Mini Program backend
3. You should have already completed the general cloud development setup

## Setup Steps

### 1. Create Database Collections

1. In the WeChat Developer Tool, open the "Cloud Development" panel
2. Go to the "Database" tab
3. Create a new collection named `trades`

### 2. Deploy Cloud Functions

1. Open the WeChat Developer Tool
2. Right-click on the `cloudfunctions` folder in your project
3. Select "Upload and Deploy All Cloud Functions"
4. Ensure the following cloud functions are deployed:
   - `saveUserInfo`
   - `getUserInfo`
   - `tradeOperations`

### 3. Verify Cloud Function Permissions

Make sure your cloud functions have the necessary database permissions:
- Read/Write access to the `trades` collection
- Read/Write access to the `users` collection

## Database Structure

### Trades Collection

The `trades` collection stores all trade records with the following structure:

```javascript
{
  _id: string,           // Auto-generated document ID
  _openid: string,       // User's OpenID (auto-added by cloud function)
  id: number,            // Client-generated unique ID
  stockCode: string,     // Stock/fund code
  stockName: string,     // Stock/fund name
  type: string,          // Trade type ('buy' or 'sell')
  price: number,         // Trade price
  quantity: number,      // Trade quantity
  amount: number,        // Total amount
  date: string,          // Trade date (YYYY-MM-DD)
  profit: number,        // Calculated profit/loss
  matches: array,        // Matching details
  remainingQuantity: number, // Remaining unmatched quantity
  createTime: date       // Server timestamp
}
```

## Testing

After completing the setup:

1. Restart the WeChat Developer Tool
2. Navigate to the home page
3. Add a new trade record using the "添加交易" button
4. Verify the trade appears in the list
5. Check that the trade record is stored in the cloud database

## Troubleshooting

If you encounter issues:

1. Ensure your cloud environment ID is correct in [app.js](file:///Users/kongzheng/workspace/zz/app.js)
2. Check that all cloud functions are deployed successfully
3. Verify the `trades` collection exists in the database
4. Make sure you're using a supported version of the WeChat Developer Tool
5. Check the cloud function logs for any error messages

## Migration Notes

The application now uses cloud storage for all trade data instead of local storage. Existing local data will not be automatically migrated to the cloud. Users will need to re-enter their trade records or implement a manual migration process.