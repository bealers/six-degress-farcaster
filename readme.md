## User Flow

1. User sees cast with frame → Shows an image with a button
2. User clicks button → Opens full frame showing a selection of popular Farcaster users
3. User selects a personality → App calculates connection path using BFS algorithm
4. Result shows: "You're X degrees away from @popular_person through @user1 → @user2"
5. Share button generates a new frame: "I'm X degrees from @popular_person! What about you?"

## Current Status and Known Issues

- ✅ In-feed frame works with proper meta tags
- ✅ Full frame opens with popular personalities selection 