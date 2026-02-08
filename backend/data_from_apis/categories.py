

def determine_categories(title, description, venue, categories): 
    
    text = f"{title} {description} {venue}".lower()
    
    # Music keywords
    music_keywords = [
        'concert', 'band', 'music', 'dj', 'festival', 'tour', 'show',
        'symphony', 'orchestra', 'jazz', 'rock', 'pop', 'hip hop',
        'rapper', 'singer', 'acoustic', 'live music'
    ]
    if any(keyword in text for keyword in music_keywords):
        categories.append('Music')
    
    # Sports keywords
    sports_keywords = [
        'game', 'match', 'warriors', 'giants', '49ers', 'sharks',
        'football', 'basketball', 'baseball', 'hockey', 'soccer',
        'nba', 'nfl', 'mlb', 'nhl', 'mls', 'sport'
    ]
    if any(keyword in text for keyword in sports_keywords):
        categories.append('Sports')
    
    # Arts & Theater keywords
    arts_keywords = [
        'theater', 'theatre', 'play', 'musical', 'opera', 'ballet',
        'dance', 'gallery', 'exhibition', 'art show', 'performance',
        'drama', 'comedy show', 'improv', 'stand-up'
    ]
    if any(keyword in text for keyword in arts_keywords):
        categories.append('Arts & Theater')
    
    # Food & Drink keywords
    food_keywords = [
        'food', 'wine', 'beer', 'tasting', 'restaurant', 'dinner',
        'brunch', 'cocktail', 'brewery', 'culinary', 'cooking',
        'food truck', 'farmers market'
    ]
    if any(keyword in text for keyword in food_keywords):
        categories.append('Food & Drink')
    
    # Community keywords
    community_keywords = [
        'community', 'fundraiser', 'charity', 'volunteer', 'local',
        'neighborhood', 'town hall', 'meetup', 'gathering'
    ]
    if any(keyword in text for keyword in community_keywords):
        categories.append('Community')
    
    # Family keywords
    family_keywords = [
        'family', 'kids', 'children', 'youth', 'toddler', 'baby',
        'story time', 'playground', 'zoo', 'aquarium'
    ]
    if any(keyword in text for keyword in family_keywords):
        categories.append('Family')
    
    # Nightlife keywords
    nightlife_keywords = [
        'nightclub', 'club', 'party', 'rave', 'lounge', 'bar crawl',
        'late night', 'after hours', 'nightlife'
    ]
    if any(keyword in text for keyword in nightlife_keywords):
        categories.append('Nightlife')
    
    # Fitness keywords
    fitness_keywords = [
        'yoga', 'fitness', 'workout', 'run', 'marathon', 'cycling',
        'gym', 'exercise', 'wellness', 'meditation', 'health',
        '5k', '10k', 'half marathon', 'triathlon'
    ]
    if any(keyword in text for keyword in fitness_keywords):
        categories.append('Fitness & Wellness')
    
    # Education keywords
    education_keywords = [
        'workshop', 'class', 'seminar', 'lecture', 'course',
        'training', 'tutorial', 'learn', 'education', 'conference'
    ]
    if any(keyword in text for keyword in education_keywords):
        categories.append('Education')
    
    # Business keywords
    business_keywords = [
        'business', 'networking', 'startup', 'entrepreneur',
        'professional', 'career', 'job fair', 'tech talk'
    ]
    if any(keyword in text for keyword in business_keywords):
        categories.append('Business & Networking')
    
    # Default to 'Other' if no categories matched
    if not categories:
        categories.append('Other')
    
    return categories