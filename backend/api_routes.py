"""
Example Flask routes using db_queries.py
Add these routes to your existing Flask app
"""

from flask import Flask, jsonify, request

# Import all query functions
from db_queries import (
    get_user_by_id,
    get_user_by_username,
    get_user_stats,
    get_post_by_id,
    get_posts_feed,
    get_user_posts,
    get_post_engagement,
    check_user_post_interactions,
    get_all_categories,
    get_posts_by_category,
    get_post_comments,
    get_listening_history,
    get_search_history,
    search_posts,
    get_trending_topics,
    get_user_bookmarks,
    get_pagination_info
)

# Assuming you have the app instance
# app = Flask(__name__)


# ==================== USER ROUTES ====================

@app.get("/users/<int:user_id>")
def get_user(user_id: int):
    """Get user profile with stats."""
    user = get_user_by_id(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    stats = get_user_stats(user_id)

    return jsonify({
        "user": {
            "id": user["user_id"],
            "username": user["username"],
            "email": user["email"],
            "display_name": user["display_name"],
            "bio": user.get("bio"),
            "profile_image_url": user.get("profile_image_url"),
            "location": None,  # Add to schema if needed
            "created_at": user["created_at"],
            "stats": stats
        }
    })


@app.get("/users/me")
def get_current_user():
    """Get current user profile (requires auth)."""
    # In production, get user_id from JWT token
    user_id = request.args.get("user_id", type=int)
    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    return get_user(user_id)


# ==================== POST/FEED ROUTES ====================

@app.get("/posts")
def get_feed():
    """Get personalized feed."""
    user_id = request.args.get("user_id", type=int)
    page = request.args.get("page", default=1, type=int)
    limit = request.args.get("limit", default=20, type=int)
    sort = request.args.get("sort", default="recent")

    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    if limit > 50:
        limit = 50

    posts = get_posts_feed(user_id, page=page, limit=limit, sort=sort)

    # For production, you'd get total count from a separate query
    total_count = len(posts) * 10  # Placeholder
    pagination = get_pagination_info(total_count, page, limit)

    return jsonify({
        "posts": posts,
        "pagination": pagination
    })


@app.get("/posts/<int:post_id>")
def get_single_post(post_id: int):
    """Get a single post by ID."""
    user_id = request.args.get("user_id", type=int)  # For privacy check

    post = get_post_by_id(post_id, requesting_user_id=user_id)
    if not post:
        return jsonify({"error": "Post not found or private"}), 404

    # Add user interaction info if user_id provided
    if user_id:
        interactions = check_user_post_interactions(user_id, post_id)
        post.update(interactions)

    return jsonify({"post": post})


@app.get("/posts/user/<int:user_id>")
def get_posts_by_user(user_id: int):
    """Get posts by a specific user."""
    filter_type = request.args.get("filter", default="all")
    page = request.args.get("page", default=1, type=int)
    limit = request.args.get("limit", default=20, type=int)

    if limit > 50:
        limit = 50

    posts = get_user_posts(user_id, filter_type=filter_type, page=page, limit=limit)

    return jsonify({
        "posts": posts,
        "pagination": get_pagination_info(len(posts) * 5, page, limit)  # Placeholder
    })


@app.get("/posts/user/me")
def get_my_posts():
    """Get current user's posts."""
    user_id = request.args.get("user_id", type=int)
    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    return get_posts_by_user(user_id)


# ==================== CATEGORY ROUTES ====================

@app.get("/categories")
def get_categories():
    """Get all categories."""
    categories = get_all_categories()
    return jsonify({"categories": categories})


@app.get("/categories/<int:category_id>/posts")
def get_category_posts(category_id: int):
    """Get posts in a category."""
    page = request.args.get("page", default=1, type=int)
    limit = request.args.get("limit", default=20, type=int)

    posts = get_posts_by_category(category_id, page=page, limit=limit)

    return jsonify({
        "posts": posts,
        "pagination": get_pagination_info(len(posts) * 5, page, limit)
    })


# ==================== COMMENT ROUTES ====================

@app.get("/posts/<int:post_id>/comments")
def get_comments(post_id: int):
    """Get comments for a post."""
    page = request.args.get("page", default=1, type=int)
    limit = request.args.get("limit", default=20, type=int)

    comments = get_post_comments(post_id, page=page, limit=limit)

    return jsonify({
        "comments": comments,
        "pagination": get_pagination_info(len(comments) * 3, page, limit)
    })


# ==================== HISTORY ROUTES ====================

@app.get("/history/listening")
def get_user_listening_history():
    """Get user's listening history."""
    user_id = request.args.get("user_id", type=int)
    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    page = request.args.get("page", default=1, type=int)
    limit = request.args.get("limit", default=50, type=int)
    completed_only = request.args.get("completed", default="false").lower() == "true"

    history = get_listening_history(user_id, page=page, limit=limit, completed_only=completed_only)

    return jsonify({
        "history": history,
        "pagination": get_pagination_info(len(history) * 3, page, limit)
    })


@app.get("/history/searches")
def get_user_search_history():
    """Get user's search history."""
    user_id = request.args.get("user_id", type=int)
    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    page = request.args.get("page", default=1, type=int)
    limit = request.args.get("limit", default=50, type=int)

    searches = get_search_history(user_id, page=page, limit=limit)

    return jsonify({"searches": searches})


# ==================== SEARCH ROUTES ====================

@app.get("/search")
def search():
    """Search posts."""
    query = request.args.get("q")
    if not query:
        return jsonify({"error": "Search query 'q' is required"}), 400

    category_id = request.args.get("categoryId", type=int)
    page = request.args.get("page", default=1, type=int)
    limit = request.args.get("limit", default=20, type=int)
    user_id = request.args.get("user_id", type=int)

    results = search_posts(
        query=query,
        category_id=category_id,
        page=page,
        limit=limit,
        requesting_user_id=user_id
    )

    return jsonify({
        "results": results,
        "pagination": get_pagination_info(len(results) * 5, page, limit)
    })


# ==================== TRENDING ROUTES ====================

@app.get("/trending/topics")
def get_trending():
    """Get trending topics."""
    limit = request.args.get("limit", default=5, type=int)

    topics = get_trending_topics(limit=limit)

    return jsonify({"topics": topics})


# ==================== BOOKMARK ROUTES ====================

@app.get("/bookmarks")
def get_bookmarks():
    """Get user's bookmarked posts."""
    user_id = request.args.get("user_id", type=int)
    if not user_id:
        return jsonify({"error": "user_id required"}), 400

    page = request.args.get("page", default=1, type=int)
    limit = request.args.get("limit", default=20, type=int)

    bookmarks = get_user_bookmarks(user_id, page=page, limit=limit)

    return jsonify({
        "bookmarks": bookmarks,
        "pagination": get_pagination_info(len(bookmarks) * 3, page, limit)
    })


# ==================== ENGAGEMENT STATS ROUTES ====================

@app.get("/posts/<int:post_id>/engagement")
def get_post_engagement_stats(post_id: int):
    """Get engagement statistics for a post."""
    engagement = get_post_engagement(post_id)
    return jsonify(engagement)


# Example of how to use in your existing main.py:
"""
# In your main.py, import these routes:

from flask import Flask
# ... your other imports ...
from api_routes import *  # Import all routes

# Or import specific routes:
# from api_routes import get_user, get_feed, get_categories, etc.

# Then your existing routes will work alongside these new ones
"""
