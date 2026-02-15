"""
Database query functions for VoiceVault backend.
Handles all read operations from Supabase.
"""

import os
from typing import Any, Dict, List, Optional

from supabase import Client, create_client

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
    raise RuntimeError(
        "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
    )

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


# ==================== USER QUERIES ====================

def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    """Get user information by user ID."""
    response = supabase.table("users").select("*").eq("user_id", user_id).execute()
    data = getattr(response, "data", None) or []
    return data[0] if data else None


def get_user_by_username(username: str) -> Optional[Dict[str, Any]]:
    """Get user information by username."""
    response = supabase.table("users").select("*").eq("username", username).execute()
    data = getattr(response, "data", None) or []
    return data[0] if data else None


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    """Get user information by email."""
    response = supabase.table("users").select("*").eq("email", email).execute()
    data = getattr(response, "data", None) or []
    return data[0] if data else None


def get_user_stats(user_id: int) -> Dict[str, int]:
    """Get user statistics (posts, followers, following)."""
    # Get post count
    posts_response = supabase.table("posts").select("post_id", count="exact").eq("user_id", user_id).execute()
    post_count = getattr(posts_response, "count", 0) or 0

    # Get followers count
    followers_response = supabase.table("user_follows").select("follower_id", count="exact").eq("following_id", user_id).execute()
    followers_count = getattr(followers_response, "count", 0) or 0

    # Get following count
    following_response = supabase.table("user_follows").select("following_id", count="exact").eq("follower_id", user_id).execute()
    following_count = getattr(following_response, "count", 0) or 0

    # Get total listeners (sum of all listens on user's posts)
    listens_response = supabase.rpc("get_user_total_listeners", {"p_user_id": user_id}).execute()
    total_listeners = getattr(listens_response, "data", 0) or 0

    return {
        "posts": post_count,
        "followers": followers_count,
        "following": following_count,
        "listeners": total_listeners
    }


# ==================== POST QUERIES ====================

def get_post_by_id(post_id: int, requesting_user_id: Optional[int] = None) -> Optional[Dict[str, Any]]:
    """
    Get a single post by ID with user info and categories.
    Returns None if post is private and requesting_user_id doesn't match post owner.
    """
    response = (
        supabase.table("posts")
        .select("""
            *,
            users!inner(user_id, username, display_name, profile_image_url),
            post_categories!inner(category_id, categories!inner(name))
        """)
        .eq("post_id", post_id)
        .execute()
    )

    data = getattr(response, "data", None) or []
    if not data:
        return None

    post = data[0]

    # Check privacy
    if post.get("is_private") and post.get("user_id") != requesting_user_id:
        return None

    return _format_post(post)


def get_posts_feed(
    user_id: int,
    page: int = 1,
    limit: int = 20,
    sort: str = "recent"
) -> List[Dict[str, Any]]:
    """
    Get personalized feed for a user.
    Includes posts from followed users and followed categories.
    """
    offset = (page - 1) * limit

    # Base query
    query = (
        supabase.table("posts")
        .select("""
            *,
            users!inner(user_id, username, display_name, profile_image_url),
            post_categories(category_id, categories(name))
        """)
        .eq("is_private", False)
    )

    # Apply sorting
    if sort == "recent":
        query = query.order("created_at", desc=True)
    elif sort == "popular":
        # Would need a view or function to sort by engagement
        query = query.order("created_at", desc=True)

    response = query.range(offset, offset + limit - 1).execute()
    data = getattr(response, "data", None) or []

    return [_format_post(post) for post in data]


def get_user_posts(
    user_id: int,
    filter_type: str = "all",
    page: int = 1,
    limit: int = 20
) -> List[Dict[str, Any]]:
    """
    Get posts created by a specific user.
    filter_type: 'all', 'public', 'private'
    """
    offset = (page - 1) * limit

    query = (
        supabase.table("posts")
        .select("""
            *,
            post_categories(category_id, categories(name))
        """)
        .eq("user_id", user_id)
    )

    # Apply filter
    if filter_type == "public":
        query = query.eq("is_private", False)
    elif filter_type == "private":
        query = query.eq("is_private", True)

    response = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    data = getattr(response, "data", None) or []

    return [_format_post(post) for post in data]


def get_post_engagement(post_id: int) -> Dict[str, int]:
    """Get engagement metrics for a post (likes, comments, listens)."""
    # Get likes count
    likes_response = supabase.table("post_likes").select("user_id", count="exact").eq("post_id", post_id).execute()
    likes_count = getattr(likes_response, "count", 0) or 0

    # Get comments count
    comments_response = supabase.table("comments").select("comment_id", count="exact").eq("post_id", post_id).execute()
    comments_count = getattr(comments_response, "count", 0) or 0

    # Get listens count
    listens_response = supabase.table("audio_listening_history").select("history_id", count="exact").eq("post_id", post_id).execute()
    listens_count = getattr(listens_response, "count", 0) or 0

    # Get bookmarks count
    bookmarks_response = supabase.table("bookmarks").select("user_id", count="exact").eq("post_id", post_id).execute()
    bookmarks_count = getattr(bookmarks_response, "count", 0) or 0

    return {
        "likes": likes_count,
        "comments": comments_count,
        "listens": listens_count,
        "bookmarks": bookmarks_count
    }


def check_user_post_interactions(user_id: int, post_id: int) -> Dict[str, bool]:
    """Check if user has liked/bookmarked a post."""
    # Check if liked
    like_response = supabase.table("post_likes").select("user_id").eq("user_id", user_id).eq("post_id", post_id).execute()
    is_liked = len(getattr(like_response, "data", []) or []) > 0

    # Check if bookmarked
    bookmark_response = supabase.table("bookmarks").select("user_id").eq("user_id", user_id).eq("post_id", post_id).execute()
    is_bookmarked = len(getattr(bookmark_response, "data", []) or []) > 0

    return {
        "is_liked": is_liked,
        "is_bookmarked": is_bookmarked
    }


# ==================== CATEGORY QUERIES ====================

def get_all_categories() -> List[Dict[str, Any]]:
    """Get all categories."""
    response = supabase.table("categories").select("*").execute()
    data = getattr(response, "data", None) or []
    return data


def get_category_by_id(category_id: int) -> Optional[Dict[str, Any]]:
    """Get category by ID."""
    response = supabase.table("categories").select("*").eq("category_id", category_id).execute()
    data = getattr(response, "data", None) or []
    return data[0] if data else None


def get_posts_by_category(
    category_id: int,
    page: int = 1,
    limit: int = 20
) -> List[Dict[str, Any]]:
    """Get posts in a specific category."""
    offset = (page - 1) * limit

    response = (
        supabase.table("post_categories")
        .select("""
            posts!inner(*,
                users!inner(user_id, username, display_name, profile_image_url),
                post_categories(category_id, categories(name))
            )
        """)
        .eq("category_id", category_id)
        .eq("posts.is_private", False)
        .order("posts.created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    data = getattr(response, "data", None) or []
    return [_format_post(item["posts"]) for item in data]


# ==================== COMMENT QUERIES ====================

def get_post_comments(post_id: int, page: int = 1, limit: int = 20) -> List[Dict[str, Any]]:
    """Get comments for a specific post."""
    offset = (page - 1) * limit

    response = (
        supabase.table("comments")
        .select("""
            *,
            users!inner(user_id, username, display_name, profile_image_url)
        """)
        .eq("post_id", post_id)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    data = getattr(response, "data", None) or []
    return data


# ==================== HISTORY QUERIES ====================

def get_listening_history(
    user_id: int,
    page: int = 1,
    limit: int = 50,
    completed_only: bool = False
) -> List[Dict[str, Any]]:
    """Get user's listening history."""
    offset = (page - 1) * limit

    query = (
        supabase.table("audio_listening_history")
        .select("""
            *,
            posts!inner(*,
                users!inner(user_id, username, display_name, profile_image_url)
            )
        """)
        .eq("user_id", user_id)
    )

    if completed_only:
        query = query.eq("completed", True)

    response = query.order("listened_at", desc=True).range(offset, offset + limit - 1).execute()
    data = getattr(response, "data", None) or []

    return data


def get_search_history(user_id: int, page: int = 1, limit: int = 50) -> List[Dict[str, Any]]:
    """Get user's search history."""
    offset = (page - 1) * limit

    response = (
        supabase.table("search_history")
        .select("*")
        .eq("user_id", user_id)
        .order("searched_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    data = getattr(response, "data", None) or []
    return data


# ==================== SEARCH QUERIES ====================

def search_posts(
    query: str,
    category_id: Optional[int] = None,
    page: int = 1,
    limit: int = 20,
    requesting_user_id: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Search posts by text query.
    Uses full-text search on title and transcribed_text.
    """
    offset = (page - 1) * limit

    # Basic search using ilike (for simple text matching)
    # For production, you'd want to use PostgreSQL full-text search
    search_query = (
        supabase.table("posts")
        .select("""
            *,
            users!inner(user_id, username, display_name, profile_image_url),
            post_categories(category_id, categories(name))
        """)
        .eq("is_private", False)
        .or_(f"title.ilike.%{query}%,transcribed_text.ilike.%{query}%")
    )

    if category_id:
        # This would need a join with post_categories
        pass

    response = search_query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
    data = getattr(response, "data", None) or []

    return [_format_post(post) for post in data]


# ==================== TRENDING QUERIES ====================

def get_trending_topics(limit: int = 5) -> List[Dict[str, Any]]:
    """
    Get trending categories based on recent post activity.
    This is a simplified version - for production, you'd want a materialized view.
    """
    # This would ideally be a database view or function
    # For now, we'll get categories with most posts in last 7 days
    response = (
        supabase.rpc("get_trending_categories", {"p_limit": limit})
        .execute()
    )

    data = getattr(response, "data", None) or []
    return data


# ==================== BOOKMARKS QUERIES ====================

def get_user_bookmarks(user_id: int, page: int = 1, limit: int = 20) -> List[Dict[str, Any]]:
    """Get user's bookmarked posts."""
    offset = (page - 1) * limit

    response = (
        supabase.table("bookmarks")
        .select("""
            *,
            posts!inner(*,
                users!inner(user_id, username, display_name, profile_image_url),
                post_categories(category_id, categories(name))
            )
        """)
        .eq("user_id", user_id)
        .order("bookmarked_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    data = getattr(response, "data", None) or []
    return [_format_post(item["posts"]) for item in data]


# ==================== HELPER FUNCTIONS ====================

def _format_post(post: Dict[str, Any]) -> Dict[str, Any]:
    """Format post data to include engagement metrics and clean structure."""
    post_id = post.get("post_id")

    # Get engagement metrics
    engagement = get_post_engagement(post_id) if post_id else {"likes": 0, "comments": 0, "listens": 0, "bookmarks": 0}

    # Extract categories
    categories = []
    if "post_categories" in post and post["post_categories"]:
        for pc in post["post_categories"]:
            if "categories" in pc and pc["categories"]:
                categories.append(pc["categories"])

    # Clean user data
    user_data = post.get("users", {})

    return {
        "id": post.get("post_id"),
        "user_id": post.get("user_id"),
        "title": post.get("title"),
        "audio_url": post.get("audio_url"),
        "transcribed_text": post.get("transcribed_text"),
        "audio_duration_seconds": post.get("audio_duration_seconds"),
        "image_url": post.get("image_url"),
        "is_private": post.get("is_private"),
        "created_at": post.get("created_at"),
        "updated_at": post.get("updated_at"),
        "user": {
            "id": user_data.get("user_id"),
            "username": user_data.get("username"),
            "display_name": user_data.get("display_name"),
            "profile_image_url": user_data.get("profile_image_url")
        },
        "categories": categories,
        "likes": engagement["likes"],
        "comments": engagement["comments"],
        "listens": engagement["listens"],
        "bookmarks": engagement["bookmarks"]
    }


def get_pagination_info(total_count: int, page: int, limit: int) -> Dict[str, Any]:
    """Calculate pagination information."""
    total_pages = (total_count + limit - 1) // limit
    has_more = page < total_pages

    return {
        "current_page": page,
        "total_pages": total_pages,
        "total_items": total_count,
        "items_per_page": limit,
        "has_more": has_more
    }
