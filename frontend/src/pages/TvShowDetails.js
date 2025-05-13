import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import tmdbApi, { getImageUrl } from '../api/tmdbApi';
import { useAuth } from '../hooks/useAuth';
import VideoPlayer from '../components/VideoPlayer';
import moviePlaceholder from '../assets/images/movie-placeholder';

const TvShowDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, checkSubscription } = useAuth();
  const [tvShow, setTvShow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [seasons, setSeasons] = useState([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [episodes, setEpisodes] = useState([]);
  const [similarShows, setSimilarShows] = useState([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [trailerKey, setTrailerKey] = useState(null);
  const [selectedEpisodeTrailer, setSelectedEpisodeTrailer] = useState(null);

  useEffect(() => {
    // Scroll to top only when component first mounts
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [id]); // Only re-run if TV show id changes
    
  useEffect(() => {
    // Check if user has subscription access
    const checkAccess = async () => {
      if (!isAuthenticated) {
        navigate('/login');
        return;
      }
      
      // Admins and superadmins always have access
      if (user.role === 'admin' || user.role === 'superadmin') {
        setHasAccess(true);
        return;
      }
      
      // Real-time check of subscription/access code validity with expiry validation
      const hasValidSubscription = await checkSubscription();
      
      if (!hasValidSubscription) {
        console.log('User does not have a valid subscription or access code. Redirecting to subscriptions page...');
        navigate('/subscriptions');
        return;
      }
      
      // Differentiate between subscription and access code for analytics
      if (user.hasSubscription) {
        console.log(`User accessing content with subscription plan: ${user.subscriptionPlan?.name}`);
      } else if (user.hasAccessCode) {
        console.log(`User accessing content with access code from: ${user.accessCodeDetails?.ownerUsername}`);
      }
      
      setHasAccess(true);
    };
    
    checkAccess();
  }, [isAuthenticated, user, navigate, checkSubscription]);

  useEffect(() => {
    // Only fetch TV show details if user has access
    if (!hasAccess) return;
    
    const fetchTvShowDetails = async () => {
      try {
        setLoading(true);
        // Use tmdbApi directly for TV show details instead of axios
        const tvData = await tmdbApi.getTvShowDetails(id);
        
        if (!tvData) {
          throw new Error('TV show details not found');
        }
        
        setTvShow(tvData);
        
        // Find trailer video key if available
        if (tvData.videos && tvData.videos.results && tvData.videos.results.length > 0) {
          // Find official trailer first
          const trailer = tvData.videos.results.find(video => 
            video.type === 'Trailer' && video.site === 'YouTube' && video.official === true
          ) || 
          // Then any trailer
          tvData.videos.results.find(video => 
            video.type === 'Trailer' && video.site === 'YouTube'
          ) || 
          // Then any teaser
          tvData.videos.results.find(video => 
            video.type === 'Teaser' && video.site === 'YouTube'
          ) ||
          // Or first video
          tvData.videos.results.find(video => video.site === 'YouTube');
          
          if (trailer) {
            setTrailerKey(trailer.key);
          }
        }
        
        // Set available seasons
        if (tvData.number_of_seasons) {
          setSeasons(Array.from({ length: tvData.number_of_seasons }, (_, i) => i + 1));
        }
        
        // Fetch episodes for the first season by default
        if (tvData.number_of_seasons > 0) {
          try {
            const seasonData = await tmdbApi.getTvSeasonDetails(id, 1);
            if (seasonData && seasonData.episodes) {
              setEpisodes(seasonData.episodes);
            } else {
              setEpisodes([]);
            }
          } catch (seasonErr) {
            console.error('Error fetching season details:', seasonErr);
            setEpisodes([]);
          }
        }
        
        // Get similar shows from the recommendations or similar in the tvData
        const similarData = await tmdbApi.getSimilarTvShows(id);
        setSimilarShows(similarData.slice(0, 6));
        
      } catch (err) {
        console.error('Error fetching TV show details:', err);
        setError('Failed to load TV show details. Please try again later.');
        
        // Set dummy data for development/preview
        setTvShow({
          id: parseInt(id),
          name: 'Sample TV Show',
          poster_path: moviePlaceholder,
          backdrop_path: moviePlaceholder,
          first_air_date: '2020-01-15',
          last_air_date: '2023-05-10',
          number_of_seasons: 3,
          number_of_episodes: 24,
          vote_average: 8.7,
          vote_count: 1530,
          genres: [
            { id: 1, name: 'Drama' }, 
            { id: 2, name: 'Sci-Fi' }, 
            { id: 3, name: 'Adventure' }
          ],
          overview: 'This is a sample TV show overview. It would normally contain a description of the show premise and other relevant information.',
          created_by: [{ name: 'Creator One' }, { name: 'Creator Two' }],
          credits: {
            cast: [
              { name: 'Actor One', character: 'Character 1' },
              { name: 'Actor Two', character: 'Character 2' },
              { name: 'Actor Three', character: 'Character 3' },
              { name: 'Actor Four', character: 'Character 4' }
            ]
          }
        });
        
        // Set dummy seasons
        setSeasons([1, 2, 3]);
        
        // Don't set dummy episodes - leave as empty array
        setEpisodes([]);
        
        // Set dummy similar shows
        setSimilarShows(Array(6).fill().map((_, idx) => ({
          id: 2000 + idx,
          name: `Similar Show ${idx + 1}`,
          poster_path: moviePlaceholder,
          vote_average: (Math.random() * 2 + 7).toFixed(1)
        })));
      } finally {
        setLoading(false);
      }
    };
    
    fetchTvShowDetails();
  }, [id, hasAccess]);

  const handleSeasonChange = async (seasonNumber) => {
    setSelectedSeason(seasonNumber);
    
    try {
      const seasonData = await tmdbApi.getTvSeasonDetails(id, seasonNumber);
      console.log('Full season data:', seasonData);
      if (seasonData && seasonData.episodes) {
        // Log the still_path values for debugging
        seasonData.episodes.forEach(episode => {
          console.log(`Episode ${episode.episode_number} still_path:`, episode.still_path);
        });
        setEpisodes(seasonData.episodes);
      } else {
        setEpisodes([]);
      }
    } catch (err) {
      console.error(`Error fetching episodes for season ${seasonNumber}:`, err);
      setEpisodes([]);
    }
  };

  // Helper to get image URL or fallback to the URL if it's already a full URL
  const getImageWithFallback = (path, size = 'original') => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return getImageUrl(path, size);
  };

  // Extract cast members
  const cast = tvShow?.credits?.cast?.slice(0, 10) || [];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900 text-white">
        <div className="text-xl p-8 rounded-lg">
          <div className="animate-pulse flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p>Loading TV show details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!tvShow && !loading) {
    return (
      <div className="container mx-auto px-4 py-12 bg-gray-900 text-white">
        <div className="bg-red-900 border border-red-600 text-white px-4 py-3 rounded mb-6">
          TV show not found or has been removed.
        </div>
        <Link to="/browse" className="text-red-600 hover:underline">
          &larr; Back to Browse
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {showTrailer && (
        <VideoPlayer
          videoKey={selectedEpisodeTrailer ? null : trailerKey}
          title={selectedEpisodeTrailer ? selectedEpisodeTrailer.title : tvShow?.name}
          onClose={() => {
            setShowTrailer(false);
            setSelectedEpisodeTrailer(null);
          }}
        />
      )}

      {/* TV Show Backdrop */}
      <div className="relative">
        <div
          className="aspect-[21/9] bg-cover bg-center"
          style={{
            backgroundImage: `url(${getImageWithFallback(tvShow.backdrop_path)})`,
            backgroundPosition: 'center 20%',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent opacity-90" />
        </div>
      </div>

      {/* TV Show Content */}
      <div className="container mx-auto px-4 py-12">
        {error && (
          <div className="bg-red-900 border border-red-600 text-white px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-8">
          {/* TV Show Poster */}
          <div className="md:w-1/3 lg:w-1/4 mb-8 md:mb-0">
            <img
              src={getImageWithFallback(tvShow.poster_path, 'w500')}
              alt={tvShow.name}
              className="w-full rounded-lg shadow-lg"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = moviePlaceholder;
              }}
            />
          </div>

          {/* TV Show Info */}
          <div className="md:w-2/3 lg:w-3/4">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">{tvShow.name}</h1>

            <div className="flex items-center mb-4 text-sm text-gray-400">
              <span className="mr-4">{new Date(tvShow.first_air_date).getFullYear()}</span>
              <span className="mr-4">{tvShow.number_of_seasons} Seasons</span>
              <span className="mr-4">{tvShow.number_of_episodes} Episodes</span>
              <span className="flex items-center text-yellow-500">
                <svg
                  className="w-4 h-4 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                </svg>
                {tvShow.vote_average?.toFixed(1)} ({tvShow.vote_count?.toLocaleString()} votes)
              </span>
            </div>

            <div className="mb-6">
              {tvShow.genres && tvShow.genres.map((genre) => (
                <span
                  key={genre.id}
                  className="inline-block bg-gray-800 rounded-full px-3 py-1 text-sm font-semibold text-gray-300 mr-2 mb-2"
                >
                  {genre.name}
                </span>
              ))}
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-bold mb-2">Overview</h2>
              <p className="text-gray-300">{tvShow.overview}</p>
            </div>

            {tvShow.created_by && tvShow.created_by.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-2">Created By</h2>
                <p className="text-gray-300">
                  {tvShow.created_by.map((creator) => creator.name).join(', ')}
                </p>
              </div>
            )}

            {cast.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-bold mb-2">Cast</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {cast.map((actor, index) => (
                    <div key={index} className="text-gray-300">
                      <span className="font-medium">{actor.name}</span>
                      {actor.character && (
                        <span className="block text-sm text-gray-400">
                          as {actor.character}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-4">
              <button
                onClick={() => navigate(-1)}
                className="text-white bg-gray-800 hover:bg-gray-900 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 focus:outline-none flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Browse
              </button>
              
              {trailerKey && (
                <button
                  onClick={() => {
                    setSelectedEpisodeTrailer(null);
                    setShowTrailer(true);
                  }}
                  className="text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 focus:outline-none flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  Watch Trailer
                </button>
              )}
            </div>
          </div>
        </div>

        
        {/* Episodes Section - Only show if episodes are available */}
        {seasons.length > 0 && (
          <div className="mt-16">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-0">
                Episodes
                <span className="ml-2 text-lg text-gray-400">Season {selectedSeason}</span>
              </h2>
              
              {/* Season Selector */}
              <div className="flex items-center bg-gray-800 border border-gray-700 rounded-lg shadow-inner px-3 py-2">
                <span className="text-gray-400 mr-3">Season:</span>
                <div className="relative">
                  <select 
                    value={selectedSeason}
                    onChange={(e) => handleSeasonChange(parseInt(e.target.value))}
                    className="appearance-none bg-transparent text-white font-medium focus:outline-none pr-8"
                  >
                    {seasons.map((seasonNum) => (
                      <option key={seasonNum} value={seasonNum} className="bg-gray-800 text-white">
                        {seasonNum}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center text-gray-400">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Episodes List */}
            {episodes.length > 0 ? (
              <div className="grid gap-6">
                {episodes.map((episode) => (
                  <div 
                    key={episode.episode_number} 
                    className="bg-gray-800 hover:bg-gray-750 rounded-xl shadow-md overflow-hidden border border-gray-700 transition-all duration-300 hover:shadow-xl transform hover:-translate-y-1"
                  >
                    <div className="flex flex-col md:flex-row">
                      {/* Only show image section if still_path exists and is not null/empty */}
                      {episode.still_path && (
                        <div className="md:w-1/3 lg:w-1/4 relative overflow-hidden">
                          <div className="absolute top-3 left-3 z-10 bg-black bg-opacity-80 text-white font-mono text-xs py-1 px-2 rounded-md">
                            S{selectedSeason}:E{episode.episode_number}
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-r from-black to-transparent opacity-50 md:opacity-20 hover:opacity-30 transition-opacity z-5"></div>
                          <img 
                            src={`https://image.tmdb.org/t/p/w300${episode.still_path}`}
                            alt={`${tvShow.name} S${selectedSeason}E${episode.episode_number}`}
                            className="w-full h-full object-cover aspect-video md:aspect-auto"
                            onError={(e) => {
                              console.log(`Image load error for episode ${episode.episode_number}, path: ${episode.still_path}`);
                              e.target.onerror = null;
                              e.target.style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
                            <button className="bg-red-600 hover:bg-red-700 text-white rounded-full p-3 transform hover:scale-110 transition-transform">
                              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path>
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                      {/* Episode details - take full width if no image */}
                      <div className={`p-5 md:p-6 ${episode.still_path ? 'md:w-2/3 lg:w-3/4' : 'w-full'}`}>
                        <div className="flex items-center mb-2">
                          {!episode.still_path && (
                            <span className="bg-gray-700 text-gray-300 text-xs font-mono py-1 px-2 mr-3 rounded">
                              S{selectedSeason}:E{episode.episode_number}
                            </span>
                          )}
                          {episode.air_date && (
                            <span className="text-gray-400 text-sm">
                              {new Date(episode.air_date).toLocaleDateString(undefined, { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                          )}
                          {episode.runtime && (
                            <span className="text-gray-400 text-sm ml-3 flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {episode.runtime} min
                            </span>
                          )}
                        </div>
                        
                        <h3 className="text-xl font-bold mb-2 text-white">
                          {episode.name}
                        </h3>
                        
                        <p className="text-gray-300 mb-4 line-clamp-2 md:line-clamp-3 hover:line-clamp-none transition-all duration-300">
                          {episode.overview || "No overview available for this episode."}
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <button 
                            className="text-red-500 hover:text-red-400 font-medium flex items-center transition-colors"
                            onClick={() => {
                              setSelectedEpisodeTrailer({
                                episodeNumber: episode.episode_number,
                                seasonNumber: selectedSeason,
                                title: `${tvShow.name} - S${selectedSeason} E${episode.episode_number} - ${episode.name}`
                              });
                              setShowTrailer(true);
                            }}
                          >
                            <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path>
                            </svg>
                            Watch Episode
                          </button>
                          
                          {episode.vote_average > 0 && (
                            <div className="flex items-center text-yellow-500">
                              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                              </svg>
                              <span>{episode.vote_average.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg shadow p-8 text-center border border-gray-700">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-700 mb-4">
                  <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h18M3 16h18" />
                  </svg>
                </div>
                <h3 className="text-xl font-medium text-gray-300 mb-2">No Episode Information</h3>
                <p className="text-gray-400 max-w-md mx-auto">We couldn't find episode details for this season. Try selecting another season or check back later.</p>
              </div>
            )}
          </div>
        )}
        
        {/* Similar Shows */}
        {similarShows.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold mb-6">Similar Shows You Might Like</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
              {similarShows.map((show) => (
                <Link to={`/tv/${show.id}`} key={show.id} className="group">
                  <div className="relative overflow-hidden rounded-lg mb-2">
                    <img
                      src={show.poster_path}
                      alt={show.name}
                      className="w-full h-auto transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute top-0 right-0 bg-black bg-opacity-75 text-yellow-400 p-1 text-sm">
                      ★ {show.vote_average}
                    </div>
                  </div>
                  <h3 className="font-medium truncate">{show.name}</h3>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TvShowDetails; 