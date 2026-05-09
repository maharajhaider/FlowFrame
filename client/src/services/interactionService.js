import axios from '../api/axios';

export const interactionService = {
  async recordInteraction(taskId, interactionType, interactionData = {}, previousValue = null, newValue = null) {
    try {
      const response = await axios.post('/api/user-interactions', {
        taskId,
        interactionType,
        interactionData,
        previousValue,
        newValue
      });
      return response.data;
    } catch (error) {
      console.error('Error recording interaction:', error);
      throw error;
    }
  },

  async getWorkedOnTasks(limit = 10) {
    try {
      const response = await axios.get(`/api/user-interactions/worked-on?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching worked on tasks:', error);
      throw error;
    }
  },

  async getViewedTasks(limit = 10) {
    try {
      const response = await axios.get(`/api/user-interactions/viewed?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching viewed tasks:', error);
      throw error;
    }
  },

  async getInteractions(limit = 50, interactionType = null) {
    try {
      let url = `/api/user-interactions?limit=${limit}`;
      if (interactionType) {
        url += `&interactionType=${interactionType}`;
      }
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('Error fetching interactions:', error);
      throw error;
    }
  },

  async getInteractionCounts() {
    try {
      const response = await axios.get('/api/user-interactions/counts');
      return response.data;
    } catch (error) {
      console.error('Error fetching interaction counts:', error);
      throw error;
    }
  },

  async clearInteractions(interactionType = null) {
    try {
      let url = '/api/user-interactions';
      if (interactionType) {
        url += `?interactionType=${interactionType}`;
      }
      const response = await axios.delete(url);
      return response.data;
    } catch (error) {
      console.error('Error clearing interactions:', error);
      throw error;
    }
  }
}; 