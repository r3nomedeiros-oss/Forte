import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';

const API_URL = (process.env.REACT_APP_BACKEND_URL || '') + '/api';
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutos de cache

const DadosContext = createContext();

export const useDados = () => {
  const context = useContext(DadosContext);
  if (!context) {
    throw new Error('useDados must be used within a DadosProvider');
  }
  return context;
};

export const DadosProvider = ({ children }) => {
  // Cache de lançamentos
  const [lancamentos, setLancamentos] = useState([]);
  const [loadingLancamentos, setLoadingLancamentos] = useState(false);
  const lastFetchLancamentosRef = useRef(null);
  
  // Cache de estatísticas do dashboard
  const [statsMensal, setStatsMensal] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const lastFetchStatsRef = useRef(null);

  // Carregar lançamentos com cache
  const carregarLancamentos = useCallback(async (forceRefresh = false, filtros = {}) => {
    const temFiltros = filtros.dataInicio || filtros.dataFim || filtros.referencia;
    
    // Se tem filtros, sempre busca do servidor
    if (temFiltros) {
      setLoadingLancamentos(true);
      try {
        let url = `${API_URL}/lancamentos?t=${Date.now()}`;
        if (filtros.dataInicio) url += `&data_inicio=${filtros.dataInicio}`;
        if (filtros.dataFim) url += `&data_fim=${filtros.dataFim}`;
        if (filtros.referencia?.trim()) {
          url += `&referencia_producao=${encodeURIComponent(filtros.referencia.trim())}`;
        }
        const response = await axios.get(url);
        return response.data;
      } catch (error) {
        console.error('Erro ao carregar lançamentos:', error);
        return [];
      } finally {
        setLoadingLancamentos(false);
      }
    }
    
    // Sem filtros - usa cache
    if (!forceRefresh && lastFetchLancamentosRef.current && 
        (Date.now() - lastFetchLancamentosRef.current) < CACHE_DURATION && 
        lancamentos.length > 0) {
      return lancamentos;
    }

    setLoadingLancamentos(true);
    try {
      const response = await axios.get(`${API_URL}/lancamentos?t=${Date.now()}`);
      setLancamentos(response.data);
      lastFetchLancamentosRef.current = Date.now();
      return response.data;
    } catch (error) {
      console.error('Erro ao carregar lançamentos:', error);
      return lancamentos;
    } finally {
      setLoadingLancamentos(false);
    }
  }, [lancamentos]);

  // Carregar stats mensais com cache (para Dashboard)
  const carregarStatsMensal = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh && lastFetchStatsRef.current && 
        (Date.now() - lastFetchStatsRef.current) < CACHE_DURATION && 
        statsMensal) {
      return statsMensal;
    }

    setLoadingStats(true);
    try {
      const response = await axios.get(`${API_URL}/relatorios?periodo=mensal&t=${Date.now()}`);
      setStatsMensal(response.data);
      lastFetchStatsRef.current = Date.now();
      return response.data;
    } catch (error) {
      console.error('Erro ao carregar stats:', error);
      return statsMensal;
    } finally {
      setLoadingStats(false);
    }
  }, [statsMensal]);

  // Invalidar cache após criar/editar/deletar lançamento
  const invalidarCache = useCallback(() => {
    lastFetchLancamentosRef.current = null;
    lastFetchStatsRef.current = null;
  }, []);

  // Pré-carregar dados ao iniciar a aplicação
  useEffect(() => {
    const preCarregar = async () => {
      await Promise.all([
        carregarLancamentos(),
        carregarStatsMensal()
      ]);
    };
    preCarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DadosContext.Provider value={{ 
      lancamentos,
      loadingLancamentos,
      carregarLancamentos,
      statsMensal,
      loadingStats,
      carregarStatsMensal,
      invalidarCache
    }}>
      {children}
    </DadosContext.Provider>
  );
};

export default DadosContext;
