import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import type { Race } from '@/shared/types';
import type {
  RaceMeta,
  RaceDetailDto,
  Analytics,
  LiveTelemetry,
} from '@/shared/types/api';
import { mapRaceDetailToRace } from '@/shared/types/api';

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl }),
  endpoints: (builder) => ({
    getRaces: builder.query<RaceMeta[], void>({
      query: () => '/api/races',
    }),

    getRace: builder.query<Race, string>({
      query: (id) => `/api/races/${id}`,
      transformResponse: (response: RaceDetailDto) => mapRaceDetailToRace(response),
    }),

    getRaceTrackGpx: builder.query<string, string>({
      query: (id) => ({
        url: `/api/races/${id}/track`,
        responseHandler: 'text',
      }),
    }),

    getRaceAnalytics: builder.query<Analytics, string>({
      query: (id) => `/api/races/${id}/analytics`,
    }),

    getRaceLive: builder.query<LiveTelemetry, string>({
      query: (id) => `/api/races/${id}/live`,
    }),
  }),
});

export const {
  useGetRacesQuery,
  useGetRaceQuery,
  useGetRaceTrackGpxQuery,
  useGetRaceAnalyticsQuery,
  useGetRaceLiveQuery,
} = apiSlice;
