import React, { useState, useEffect, useRef } from 'react';
import '../styles/videoPlayer.css';

// Load YouTube Player API
const loadYouTubeAPI = () => {
  if (window.YT) return Promise.resolve(window.YT);
  
  return new Promise(resolve => {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    
    window.onYouTubeIframeAPIReady = () => {
      resolve(window.YT);
    };
  });
};

const VideoPlayer = ({ videoKey, title, onClose, autoplay = true }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const youtubePlayerRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!videoKey) return;
    
    let player = null;
    let timer = null;
    
    const initPlayer = async () => {
      try {
        const YT = await loadYouTubeAPI();
        
        player = new YT.Player('youtube-player', {
          videoId: videoKey,
          playerVars: {
            autoplay: autoplay ? 1 : 0,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
            controls: 1,
          },
          events: {
            onReady: (event) => {
              youtubePlayerRef.current = event.target;
              setIsLoading(false);
              // Set initial volume state
              if (isMuted) {
                event.target.mute();
              } else {
                event.target.unMute();
              }
            },
            onError: () => {
              setError(true);
              setIsLoading(false);
            }
          }
        });
      } catch (err) {
        setError(true);
        setIsLoading(false);
      }
    };
    
    initPlayer();
    
    // Fallback timeout if API loading fails
    timer = setTimeout(() => {
      if (isLoading) setIsLoading(false);
    }, 3000);

    return () => {
      if (timer) clearTimeout(timer);
      youtubePlayerRef.current = null;
    };
  }, [videoKey, autoplay, isMuted, isLoading]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  const toggleMute = () => {
    if (youtubePlayerRef.current) {
      if (isMuted) {
        youtubePlayerRef.current.unMute();
      } else {
        youtubePlayerRef.current.mute();
      }
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else if (containerRef.current.webkitRequestFullscreen) {
        containerRef.current.webkitRequestFullscreen();
        setIsFullscreen(true);
      } else if (containerRef.current.msRequestFullscreen) {
        containerRef.current.msRequestFullscreen();
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
        setIsFullscreen(false);
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  if (!videoKey) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
        <div className="bg-gray-800 p-8 rounded-lg max-w-lg w-full text-center">
          <h2 className="text-xl font-bold text-white mb-4">No Trailer Available</h2>
          <p className="text-gray-300 mb-6">Sorry, there is no trailer available for this title.</p>
          <button
            onClick={onClose}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-95 px-4 sm:px-6">
      <div className="relative w-full max-w-6xl video-container" ref={containerRef}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
              <p className="text-white">Loading trailer...</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
            <div className="text-center">
              <div className="bg-red-600 text-white p-4 rounded-lg">
                <p>Error loading trailer. Please try again.</p>
              </div>
            </div>
          </div>
        )}
        
        <div className="relative" style={{ paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
          <div 
            id="youtube-player" 
            ref={playerRef} 
            className="absolute top-0 left-0 w-full h-full"
          ></div>
          
          <div className="absolute top-4 right-4 sm:top-8 sm:right-8 z-10 flex justify-end">
            <div className="flex space-x-2">
              <button 
                onClick={toggleFullscreen} 
                className="bg-black bg-opacity-70 hover:bg-opacity-90 p-2 rounded-full text-white transition-colors"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M15 9H19.5M15 9V4.5M15 15V19.5M15 15H19.5M9 15H4.5M9 15V19.5" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                )}
              </button>
              
              <button
                onClick={onClose}
                className="bg-black bg-opacity-70 hover:bg-opacity-90 p-2 rounded-full text-white transition-colors"
                title="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
