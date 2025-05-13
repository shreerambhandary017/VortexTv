import React, { useState, useEffect } from 'react';
import axios from 'axios';
import api from '../../api/backendApi';
import { getImageUrl } from '../../api/tmdbApi';
import moviePlaceholder from '../../assets/images/movie-placeholder';

const Content = () => {
  const [activeTab, setActiveTab] = useState('movies');
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [perPage, setPerPage] = useState(10);
  const [formData, setFormData] = useState({
    title: '',
    overview: '',
    release_date: '',
    genres: '',
    poster_url: '',
    backdrop_url: ''
  });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchContent();
  }, [activeTab, currentPage, perPage, searchTerm]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      
      let url = `/admin/${activeTab === 'movies' ? 'movies' : 'tv'}?page=${currentPage}&per_page=${perPage}`;
      
      if (searchTerm) {
        url += `&search=${searchTerm}`;
      }
      
      const response = await api.get(url);
      
      setContent(response.data.items);
      setTotalItems(response.data.total);
    } catch (err) {
      console.error(`Error fetching ${activeTab}:`, err);
      setError(`Failed to load ${activeTab}. Please try again later.`);
      
      // Set dummy data for development/preview
      if (activeTab === 'movies') {
        const dummyMovies = Array(10).fill().map((_, idx) => ({
          id: idx + 1,
          title: `Sample Movie ${idx + 1}`,
          release_date: '2023-05-15',
          genres: ['Action', 'Drama'].join(', '),
          vote_average: (Math.random() * 2 + 7).toFixed(1),
          poster_path: moviePlaceholder,
          overview: `This is a sample overview for movie ${idx + 1}. It would contain a brief description of the plot.`
        }));
        setContent(dummyMovies);
        setTotalItems(50);
      } else {
        const dummyShows = Array(10).fill().map((_, idx) => ({
          id: idx + 1,
          name: `Sample TV Show ${idx + 1}`,
          first_air_date: '2023-05-15',
          genres: ['Drama', 'Sci-Fi'].join(', '),
          vote_average: (Math.random() * 2 + 7).toFixed(1),
          poster_path: moviePlaceholder,
          overview: `This is a sample overview for TV show ${idx + 1}. It would contain a brief description of the premise.`
        }));
        setContent(dummyShows);
        setTotalItems(50);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    // Actual search is triggered by useEffect dependency
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    
    try {
      const formattedData = {
        ...formData,
        genres: formData.genres.split(',').map(g => g.trim())
      };
      
      if (editingId) {
        // Update existing content
        await api.put(
          `/admin/${activeTab === 'movies' ? 'movies' : 'tv'}/${editingId}`,
          formattedData
        );
      } else {
        // Create new content
        await api.post(
          `/admin/${activeTab === 'movies' ? 'movies' : 'tv'}`,
          formattedData
        );
      }
      
      // Reset form and fetch updated content
      setFormData({
        title: '',
        overview: '',
        release_date: '',
        genres: '',
        poster_url: '',
        backdrop_url: ''
      });
      setEditingId(null);
      setShowForm(false);
      fetchContent();
    } catch (err) {
      console.error('Error saving content:', err);
      setError('Failed to save content. Please try again.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    
    const formattedItem = {
      title: activeTab === 'movies' ? item.title : item.name,
      overview: item.overview,
      release_date: activeTab === 'movies' ? item.release_date : item.first_air_date,
      genres: Array.isArray(item.genres) ? item.genres.join(', ') : item.genres,
      poster_url: item.poster_path,
      backdrop_url: item.backdrop_path
    };
    
    setFormData(formattedItem);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Are you sure you want to delete this ${activeTab === 'movies' ? 'movie' : 'TV show'}?`)) {
      return;
    }
    
    try {
      await api.delete(`/admin/${activeTab === 'movies' ? 'movies' : 'tv'}/${id}`);
      fetchContent();
    } catch (err) {
      console.error('Error deleting content:', err);
      setError('Failed to delete content. Please try again.');
    }
  };

  const totalPages = Math.ceil(totalItems / perPage);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Content Management</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}
      
      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              onClick={() => {
                setActiveTab('movies');
                setCurrentPage(1);
              }}
              className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
                activeTab === 'movies'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Movies
            </button>
            <button
              onClick={() => {
                setActiveTab('tv');
                setCurrentPage(1);
              }}
              className={`ml-8 py-2 px-4 text-center border-b-2 font-medium text-sm ${
                activeTab === 'tv'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              TV Shows
            </button>
          </nav>
        </div>
      </div>
      
      {/* Search & Add New */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
        <form onSubmit={handleSearch} className="flex mb-4 md:mb-0">
          <input
            type="text"
            placeholder={`Search ${activeTab === 'movies' ? 'movies' : 'TV shows'}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="rounded-l-md border-r-0 focus:ring-red-500 focus:border-red-500 block w-full sm:text-sm border-gray-300"
          />
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-r-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Search
          </button>
        </form>
        
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({
              title: '',
              overview: '',
              release_date: '',
              genres: '',
              poster_url: '',
              backdrop_url: ''
            });
            setShowForm(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add New {activeTab === 'movies' ? 'Movie' : 'TV Show'}
        </button>
      </div>
      
      {/* Form for creating/editing content */}
      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-medium mb-4">
            {editingId ? `Edit ${activeTab === 'movies' ? 'Movie' : 'TV Show'}` : `Add New ${activeTab === 'movies' ? 'Movie' : 'TV Show'}`}
          </h2>
          
          <form onSubmit={handleCreateOrUpdate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  {activeTab === 'movies' ? 'Movie Title' : 'Show Name'}
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                />
              </div>
              
              <div>
                <label htmlFor="release_date" className="block text-sm font-medium text-gray-700 mb-1">
                  {activeTab === 'movies' ? 'Release Date' : 'First Air Date'}
                </label>
                <input
                  type="date"
                  id="release_date"
                  name="release_date"
                  value={formData.release_date}
                  onChange={handleInputChange}
                  required
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                />
              </div>
              
              <div>
                <label htmlFor="genres" className="block text-sm font-medium text-gray-700 mb-1">
                  Genres (comma separated)
                </label>
                <input
                  type="text"
                  id="genres"
                  name="genres"
                  value={formData.genres}
                  onChange={handleInputChange}
                  placeholder="Action, Drama, Comedy"
                  required
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                />
              </div>
              
              <div>
                <label htmlFor="poster_url" className="block text-sm font-medium text-gray-700 mb-1">
                  Poster URL
                </label>
                <input
                  type="url"
                  id="poster_url"
                  name="poster_url"
                  value={formData.poster_url}
                  onChange={handleInputChange}
                  required
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                />
              </div>
              
              <div className="md:col-span-2">
                <label htmlFor="backdrop_url" className="block text-sm font-medium text-gray-700 mb-1">
                  Backdrop URL
                </label>
                <input
                  type="url"
                  id="backdrop_url"
                  name="backdrop_url"
                  value={formData.backdrop_url}
                  onChange={handleInputChange}
                  required
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                />
              </div>
              
              <div className="md:col-span-2">
                <label htmlFor="overview" className="block text-sm font-medium text-gray-700 mb-1">
                  Overview
                </label>
                <textarea
                  id="overview"
                  name="overview"
                  value={formData.overview}
                  onChange={handleInputChange}
                  rows={4}
                  required
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Content Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        {loading ? (
          <div className="p-6 text-center">Loading content...</div>
        ) : content.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No content found matching your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {activeTab === 'movies' ? 'Movie' : 'TV Show'}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Released
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Genres
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {content.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <img
                            className="h-10 w-10 rounded-sm object-cover"
                            src={item.poster_path?.startsWith('http') ? item.poster_path : getImageUrl(item.poster_path, 'w92')}
                            alt={activeTab === 'movies' ? item.title : item.name}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = moviePlaceholder;
                            }}
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {activeTab === 'movies' ? item.title : item.name}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {item.overview}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(activeTab === 'movies' ? item.release_date : item.first_air_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {Array.isArray(item.genres) ? item.genres.join(', ') : item.genres}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className="flex items-center text-yellow-500">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                        </svg>
                        {item.vote_average}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Showing <span className="font-medium">{content.length > 0 ? (currentPage - 1) * perPage + 1 : 0}</span> to <span className="font-medium">{Math.min(currentPage * perPage, totalItems)}</span> of <span className="font-medium">{totalItems}</span> {activeTab === 'movies' ? 'movies' : 'TV shows'}
        </div>
        <div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${
                currentPage === 1 ? 'cursor-not-allowed opacity-50' : ''
              }`}
            >
              Previous
            </button>
            
            {[...Array(Math.min(totalPages, 5))].map((_, i) => {
              // Logic for showing page numbers around current page
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${
                    pageNum === currentPage
                      ? 'text-red-600 bg-red-50'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${
                currentPage === totalPages ? 'cursor-not-allowed opacity-50' : ''
              }`}
            >
              Next
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Content; 