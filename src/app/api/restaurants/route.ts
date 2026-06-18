import { NextResponse } from 'next/server';

interface GooglePlacePhoto {
  name: string;
  widthPx: number;
  heightPx: number;
}

interface GooglePlaceReview {
  rating: number;
  text: {
    text: string;
    languageCode: string;
  };
}

interface GooglePlace {
  id: string;
  displayName?: { text: string };
  rating?: number;
  photos?: GooglePlacePhoto[];
  reviews?: GooglePlaceReview[];
  editorialSummary?: { text: string };
  types?: string[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const zipCode = searchParams.get('zipCode') || '90210';

  if (!zipCode) {
    return NextResponse.json({ error: 'Zip code is required' }, { status: 400 });
  }
  
  // Fallback to mock data if API key is missing or not configured
  if (!process.env.GOOGLE_PLACES_API_KEY || process.env.GOOGLE_PLACES_API_KEY === 'your_actual_api_key_here') {
    return NextResponse.json(MOCK_RESTAURANTS);
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'Google Places API key is missing in environment variables' }, { status: 500 });
  }

  // Using Places API (New) Text Search
  const url = 'https://places.googleapis.com/v1/places:searchText';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey || '',
        'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.photos,places.reviews,places.types,places.editorialSummary'
      },
      body: JSON.stringify({
        textQuery: `restaurants in ${zipCode}`
      })
    });

    const data: { places?: GooglePlace[], error?: { message: string } } = await response.json();

    if (!response.ok) {
      console.error('Google API Error:', data);
      return NextResponse.json({ error: data.error?.message || 'Google API Error' }, { status: response.status });
    }

    if (!data.places) {
      return NextResponse.json([]);
    }

    const formatted = data.places.slice(0, 20).map((r: GooglePlace) => {
      const sortedReviews = r.reviews?.sort((a, b) => (b.rating || 0) - (a.rating || 0)) || [];
      
      // Filter out generic Google types and clean up the names
      const genericTypes = ['restaurant', 'food', 'point_of_interest', 'establishment', 'meal_takeaway', 'meal_delivery'];
      const specificTypes = r.types
        ?.filter(t => !genericTypes.includes(t))
        .map((t: string) => t.replace(/_restaurant$/g, '').replace(/_/g, ' ')) || [];

      return {
        id: r.id,
        name: r.displayName?.text || 'Unknown Restaurant',
        image: r.photos 
          ? `https://places.googleapis.com/v1/${r.photos[0].name}/media?maxHeightPx=800&maxWidthPx=800&key=${apiKey}`
          : "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800",
        rating: r.rating || 0,
        distance: "Nearby", 
        reviews: {
          high: sortedReviews[0]?.text?.text || "Excellent food and service!",
          mid: sortedReviews[Math.floor(sortedReviews.length / 2)]?.text?.text || "A solid choice for the area.",
          low: sortedReviews[sortedReviews.length - 1]?.text?.text || "Service was a bit slow, but food was okay."
        },
        dishes: specificTypes.length > 0 ? specificTypes.slice(0, 3) : ["Local Favorite", "Top Rated"],
        summary: r.editorialSummary?.text
      };
    });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Places API Catch Error:', error);
    return NextResponse.json({ error: (error as Error).message || 'Failed to fetch restaurants' }, { status: 500 });
  }
}

const MOCK_RESTAURANTS = [
  {
    id: "mock-1",
    name: "Burger Heaven",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=800",
    rating: 4.8,
    distance: "0.4 mi",
    reviews: {
      high: "Best wagyu burger in the city. The truffle aioli is liquid gold.",
      mid: "Great food, but the line was wrapping around the block.",
      low: "Portion sizes are a bit small for the price point."
    },
    dishes: ["Wagyu Smash", "Truffle Fries", "Spiced Shake"]
  },
  {
    id: "mock-2",
    name: "Taco Loco",
    image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?q=80&w=800",
    rating: 4.5,
    distance: "1.2 mi",
    reviews: {
      high: "The Al Pastor tacos are authentic and incredibly juicy.",
      mid: "Solid tacos, but the salsa bar was a bit messy.",
      low: "Way too spicy even for the 'mild' options."
    },
    dishes: ["Al Pastor", "Street Corn", "Horchata"]
  },
  {
    id: "mock-3",
    name: "Sushi Zen",
    image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?q=80&w=800",
    rating: 4.9,
    distance: "2.1 mi",
    reviews: {
      high: "Unbelievable omakase experience. Every piece was a masterpiece.",
      mid: "Excellent fish, but the seating is quite cramped.",
      low: "Very expensive for what it is, even for high-end sushi."
    },
    dishes: ["Omakase", "Bluefin Toro", "Miso Soup"]
  }
];