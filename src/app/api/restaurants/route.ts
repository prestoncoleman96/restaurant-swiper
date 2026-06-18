import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const zipCode = searchParams.get('zipCode');

  if (!zipCode) {
    return NextResponse.json({ error: 'Zip code is required' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  // Using Places API (New) Text Search
  const url = 'https://places.googleapis.com/v1/places:searchText';

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey || '',
        'X-Goog-FieldMask': 'places.id,places.displayName,places.rating,places.photos,places.reviews,places.types'
      },
      body: JSON.stringify({
        textQuery: `restaurants in ${zipCode}`
      })
    });

    const data = await response.json();

    if (!data.places) {
      return NextResponse.json([]);
    }

    const formatted = data.places.slice(0, 20).map((r: any) => {
      const sortedReviews = r.reviews?.sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0)) || [];
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
        dishes: r.types?.slice(0, 3).map((t: string) => t.replace(/_/g, ' ')) || ["Local Favorite", "Top Rated"]
      };
    });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Places API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch restaurants' }, { status: 500 });
  }
}