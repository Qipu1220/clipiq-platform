import { createSlice } from '@reduxjs/toolkit';

interface SystemState {
  maintenanceMode: boolean;
  lastMaintenanceToggle: string | null;
}

const initialState: SystemState = {
  maintenanceMode: false,
  lastMaintenanceToggle: null,
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
    },
  },
});

export const { toggleMaintenanceMode, setMaintenanceMode } = systemSlice.actions;
export default systemSlice.reducer;
