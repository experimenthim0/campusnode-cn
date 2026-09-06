# How to Add a Flutter Mobile Feature 🛠️

## 1. Flutter Feature Implementation Checklist

Follow this workflow when introducing a new feature to the Flutter mobile codebase:

1. **API Inspection**: Review backend route and response DTO (`API_ENDPOINTS.md`).
2. **Data Model**: Create immutable Dart class with `fromJson` and `toJson` methods.
3. **Data Source**: Implement remote HTTP calls using `DioClient`.
4. **Repository**: Implement repository interface encapsulating data retrieval and error mapping.
5. **State Management**: Create Riverpod / Provider notifier managing view state (`loading`, `data`, `error`).
6. **UI Widgets**: Build native touch-friendly screens and widgets supporting dark/light mode.

---

## 2. Step-by-Step Implementation Example: "Event Bookmarks"

### Step 1: Create Dart Model (`bookmark_model.dart`)
```dart
// lib/features/bookmarks/data/models/bookmark_model.dart
class BookmarkModel {
  final String id;
  final String eventId;
  final int notifyBeforeMinutes;
  final DateTime createdAt;

  BookmarkModel({
    required this.id,
    required this.eventId,
    required this.notifyBeforeMinutes,
    required this.createdAt,
  });

  factory BookmarkModel.fromJson(Map<String, dynamic> json) {
    return BookmarkModel(
      id: json['id'] as String,
      eventId: json['eventId'] as String,
      notifyBeforeMinutes: json['notifyBeforeMinutes'] as int? ?? 60,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}
```

### Step 2: Implement Remote Data Source
```dart
// lib/features/bookmarks/data/datasources/bookmark_remote_data_source.dart
import 'package:dio/dio.dart';
import '../models/bookmark_model.dart';

abstract class BookmarkRemoteDataSource {
  Future<BookmarkModel> addBookmark(String eventId, int notifyBeforeMinutes);
}

class BookmarkRemoteDataSourceImpl implements BookmarkRemoteDataSource {
  final Dio dio;
  BookmarkRemoteDataSourceImpl(this.dio);

  @override
  Future<BookmarkModel> addBookmark(String eventId, int notifyBeforeMinutes) async {
    final response = await dio.post('/events/$eventId/bookmark', data: {
      'notifyBeforeMinutes': notifyBeforeMinutes,
    });
    return BookmarkModel.fromJson(response.data['bookmark']);
  }
}
```

### Step 3: Implement State Notifier & UI Button
```dart
// lib/features/bookmarks/presentation/widgets/bookmark_icon_button.dart
import 'package:flutter/material.dart';
import '../providers/bookmark_provider.dart';

class BookmarkIconButton extends StatelessWidget {
  final String eventId;

  const BookmarkIconButton({super.key, required this.eventId});

  @override
  Widget build(BuildContext context) {
    return IconButton(
      icon: const Icon(Icons.bookmark_border),
      onPressed: () async {
        // Trigger bookmark action via provider
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Event saved to bookmarks')),
        );
      },
    );
  }
}
```
