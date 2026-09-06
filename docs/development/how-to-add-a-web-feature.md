# How to Add a Web Frontend Feature 🛠️

## 1. Web Feature Checklist

Follow this workflow when creating a web feature:

1. **Service Layer**: Add API call method in `client/src/services/`.
2. **Presentational Components**: Create modular, focused UI components in `client/src/components/`.
3. **Screen / Page**: Assemble the screen in `client/src/pages/` or `client/src/roles/`.
4. **Routing**: Register path in `client/src/App.jsx` with appropriate `ProtectedRoute` guards.
5. **State & Toasts**: Handle loading spinners, empty states, and toast notifications.
6. **Theming**: Ensure support for dark and light modes via Tailwind CSS variables.

---

## 2. Step-by-Step Implementation Example: "Event Bookmarks"

### Step 1: Create or Update Service (`client/src/services/eventService.js`)
```javascript
import api from './api';

export const bookmarkEvent = async (eventId, notifyBeforeMinutes = 60) => {
  const response = await api.post(`/events/${eventId}/bookmark`, { notifyBeforeMinutes });
  return response.data;
};
```

### Step 2: Create Presentational Component (`client/src/components/BookmarkButton.jsx`)
```jsx
import React, { useState } from 'react';
import { Bookmark } from 'lucide-react';
import toast from 'react-hot-toast';
import { bookmarkEvent } from '../services/eventService';

export const BookmarkButton = ({ eventId, isBookmarked: initialBookmarked }) => {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      await bookmarkEvent(eventId);
      setBookmarked(true);
      toast.success('Event saved to your bookmarks!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save bookmark');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`p-2 rounded-full transition-colors ${
        bookmarked ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-accent'
      }`}
    >
      <Bookmark className={`w-5 h-5 ${bookmarked ? 'fill-current' : ''}`} />
    </button>
  );
};
```

### Step 3: Mount in Screen & Route
Include `<BookmarkButton eventId={event.id} />` in `EventCard.jsx` and verify responsive mobile touch ergonomics and theme contrast.
