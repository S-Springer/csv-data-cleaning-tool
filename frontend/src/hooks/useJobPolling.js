import { useCallback, useEffect, useRef, useState } from 'react';
import { getJobStatus } from '../services/api';

const POLL_INTERVAL_MS = 1200;

const INITIAL_JOB_STATE = {
  jobId: null,
  status: 'idle',
  result: null,
  error: null,
  lastUpdated: null,
};

const normalizeJobError = (error) => {
  if (!error) {
    return 'Background job failed';
  }

  if (typeof error === 'string') {
    return error;
  }

  return error.message || error.detail || error.type || 'Background job failed';
};

function useJobPolling({ onCompleted, onFailed } = {}) {
  const [jobState, setJobState] = useState(INITIAL_JOB_STATE);
  const timeoutRef = useRef(null);
  const isMountedRef = useRef(true);
  const callbacksRef = useRef({ onCompleted, onFailed });

  useEffect(() => {
    callbacksRef.current = { onCompleted, onFailed };
  }, [onCompleted, onFailed]);

  useEffect(() => () => {
    isMountedRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const resetJob = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (isMountedRef.current) {
      setJobState(INITIAL_JOB_STATE);
    }
  }, []);

  const pollJob = useCallback(async (jobId) => {
    try {
      const data = await getJobStatus(jobId);
      if (!isMountedRef.current) {
        return;
      }

      const nextState = {
        jobId,
        status: data.status || 'pending',
        result: data.result || null,
        error: data.error || null,
        lastUpdated: Date.now(),
      };

      setJobState(nextState);

      if (nextState.status === 'completed') {
        callbacksRef.current.onCompleted?.(nextState.result, nextState);
        return;
      }

      if (nextState.status === 'failed') {
        callbacksRef.current.onFailed?.(normalizeJobError(nextState.error), nextState);
        return;
      }

      timeoutRef.current = setTimeout(() => {
        pollJob(jobId);
      }, POLL_INTERVAL_MS);
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      const message = error?.response?.data?.detail || error.message || 'Unable to poll job status';
      const nextState = {
        jobId,
        status: 'failed',
        result: null,
        error: { message },
        lastUpdated: Date.now(),
      };

      setJobState(nextState);
      callbacksRef.current.onFailed?.(message, nextState);
    }
  }, []);

  const startPolling = useCallback((jobId) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setJobState({
      jobId,
      status: 'pending',
      result: null,
      error: null,
      lastUpdated: Date.now(),
    });

    pollJob(jobId);
  }, [pollJob]);

  return {
    jobState,
    isPolling: jobState.status === 'pending' || jobState.status === 'running',
    resetJob,
    startPolling,
  };
}

export default useJobPolling;