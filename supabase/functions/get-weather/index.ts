import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WeatherData {
  temperature: number;
  conditions: string;
  windSpeed: number;
  windDirection: string;
  humidity: number;
  icon: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude } = await req.json();

    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: "Latitude and longitude are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Weather] Fetching weather for coordinates: ${latitude}, ${longitude}`);

    // Step 1: Get the forecast grid point from coordinates
    const pointsUrl = `https://api.weather.gov/points/${latitude},${longitude}`;
    console.log(`[Weather] Fetching points from: ${pointsUrl}`);
    
    const pointsResponse = await fetch(pointsUrl, {
      headers: {
        "User-Agent": "(WinterWatch-Pro, contact@winterwatch.pro)",
        "Accept": "application/geo+json",
      },
    });

    if (!pointsResponse.ok) {
      const errorText = await pointsResponse.text();
      console.error(`[Weather] Points API error: ${pointsResponse.status} - ${errorText}`);
      
      // Weather.gov returns 404 for locations outside the US
      if (pointsResponse.status === 404) {
        return new Response(
          JSON.stringify({ 
            error: "Location outside Weather.gov coverage (US only)",
            fallback: true 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Points API failed: ${pointsResponse.status}`);
    }

    const pointsData = await pointsResponse.json();
    const forecastHourlyUrl = pointsData.properties?.forecastHourly;
    const observationStationsUrl = pointsData.properties?.observationStations;

    console.log(`[Weather] Forecast URL: ${forecastHourlyUrl}`);
    console.log(`[Weather] Observation stations URL: ${observationStationsUrl}`);

    // Step 2: Try to get current observations from nearest station
    let currentWeather: WeatherData | null = null;

    if (observationStationsUrl) {
      try {
        const stationsResponse = await fetch(observationStationsUrl, {
          headers: {
            "User-Agent": "(WinterWatch-Pro, contact@winterwatch.pro)",
            "Accept": "application/geo+json",
          },
        });

        if (stationsResponse.ok) {
          const stationsData = await stationsResponse.json();
          const nearestStation = stationsData.features?.[0]?.properties?.stationIdentifier;

          if (nearestStation) {
            console.log(`[Weather] Nearest station: ${nearestStation}`);
            
            const observationUrl = `https://api.weather.gov/stations/${nearestStation}/observations/latest`;
            const observationResponse = await fetch(observationUrl, {
              headers: {
                "User-Agent": "(WinterWatch-Pro, contact@winterwatch.pro)",
                "Accept": "application/geo+json",
              },
            });

            if (observationResponse.ok) {
              const observationData = await observationResponse.json();
              const props = observationData.properties;

              if (props) {
                // Temperature in Celsius, convert to Fahrenheit
                const tempC = props.temperature?.value;
                const tempF = tempC !== null && tempC !== undefined 
                  ? Math.round((tempC * 9/5) + 32) 
                  : null;

                // Wind speed in km/h, convert to mph
                const windKmh = props.windSpeed?.value;
                const windMph = windKmh !== null && windKmh !== undefined
                  ? Math.round(windKmh * 0.621371)
                  : null;

                // Get wind direction
                const windDegrees = props.windDirection?.value;
                const windDir = windDegrees !== null ? degreesToCardinal(windDegrees) : "";

                // Get text description
                const conditions = props.textDescription || "Unknown";

                // Get humidity
                const humidity = props.relativeHumidity?.value 
                  ? Math.round(props.relativeHumidity.value) 
                  : null;

                // Get icon
                const icon = props.icon || "";

                if (tempF !== null) {
                  currentWeather = {
                    temperature: tempF,
                    conditions,
                    windSpeed: windMph || 0,
                    windDirection: windDir,
                    humidity: humidity || 0,
                    icon,
                  };
                  console.log(`[Weather] Current observation: ${JSON.stringify(currentWeather)}`);
                }
              }
            }
          }
        }
      } catch (obsError) {
        console.error(`[Weather] Observation fetch error:`, obsError);
      }
    }

    // Step 3: If no current observation, fall back to hourly forecast
    if (!currentWeather && forecastHourlyUrl) {
      try {
        const forecastResponse = await fetch(forecastHourlyUrl, {
          headers: {
            "User-Agent": "(WinterWatch-Pro, contact@winterwatch.pro)",
            "Accept": "application/geo+json",
          },
        });

        if (forecastResponse.ok) {
          const forecastData = await forecastResponse.json();
          const currentPeriod = forecastData.properties?.periods?.[0];

          if (currentPeriod) {
            // Parse wind speed from string like "10 mph" or "5 to 10 mph"
            const windMatch = currentPeriod.windSpeed?.match(/(\d+)/);
            const windSpeed = windMatch ? parseInt(windMatch[1]) : 0;

            currentWeather = {
              temperature: currentPeriod.temperature,
              conditions: currentPeriod.shortForecast,
              windSpeed,
              windDirection: currentPeriod.windDirection || "",
              humidity: currentPeriod.relativeHumidity?.value || 0,
              icon: currentPeriod.icon || "",
            };
            console.log(`[Weather] Forecast data: ${JSON.stringify(currentWeather)}`);
          }
        }
      } catch (forecastError) {
        console.error(`[Weather] Forecast fetch error:`, forecastError);
      }
    }

    if (!currentWeather) {
      return new Response(
        JSON.stringify({ error: "Could not retrieve weather data", fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(currentWeather),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Weather] Error:`, error);
    return new Response(
      JSON.stringify({ error: errorMessage, fallback: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Convert wind direction degrees to cardinal direction
function degreesToCardinal(degrees: number): string {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}
