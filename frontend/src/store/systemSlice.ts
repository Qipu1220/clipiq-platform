import { createSlice } from '@reduxjs/toolkit';

interface SystemState {
  maintenanceMode: boolean;
  serviceMaintenanceMode: boolean;
  lastMaintenanceToggle: string | null;
  isStatusLoaded: boolean;
}

const initialState: SystemState = {
  maintenanceMode: false,
  serviceMaintenanceMode: false,
  lastMaintenanceToggle: null,
  isStatusLoaded: false,
};

const systemSlice = createSlice({
  name: 'system',
  initialState,
  reducers: {
    toggleMaintenanceMode: (state) => {
      state.maintenanceMode = !state.maintenanceMode;
      state.lastMaintenanceToggle = new Date().toISOString();
    },
    setMaintenanceMode: (state, action) => {
      state.maintenanceMode = action.payload;
      state.lastMaintenanceToggle = new Date().toISOString();
      state.isStatusLoaded = true;
    },
    setServiceMaintenanceMode: (state, action) => {
      state.serviceMaintenanceMode = action.payload;
      state.lastMaintenanceToggle = new Date().toISOString();
      state.isStatusLoaded = true;
    },
  },
});

export const { toggleMaintenanceMode, setMaintenanceMode, setServiceMaintenanceMode } = systemSlice.actions;
export default systemSlice.reducer;
