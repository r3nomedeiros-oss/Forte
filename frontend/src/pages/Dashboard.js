import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, AlertCircle, Calendar, Package } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_URL = (process.env.REACT_APP_BACKEND_URL || '') + '/api';

// Função para formatar números
const formatarKg = (valor) => {
  return new Intl.NumberFormat('pt-BR').format(Math.round(valor));
};

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [lancamentos, setLancamentos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDashboard();
  }, []);

  const carregarDashboard = async () => {
    try {
      const [statsResponse, lancamentosResponse] = await Promise.all([
        axios.get(`${API_URL}/relatorios?periodo=mensal`),
        axios.get(`${API_URL}/lancamentos`)
      ]);
      setStats(statsResponse.data);
      
      // Últimos 7 dias (incluindo hoje)
      const hoje = new Date();
      const seteDiasAtras = new Date();
      seteDiasAtras.setDate(hoje.getDate() - 6); // -6 para incluir 7 dias (hoje + 6 anteriores)
      
      const ultimos7Dias = lancamentosResponse.data.filter(lanc => {
        const dataLanc = new Date(lanc.data + 'T00:00:00'); // Adicionar hora para evitar problemas de timezone
        return dataLanc >= seteDiasAtras && dataLanc <= hoje;
      });
      
      setLancamentos(ultimos7Dias);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const prepararDadosGrafico = () => {
    // Criar array com os últimos 7 dias
    const hoje = new Date();
    const dadosPorDia = {};
    
    // Inicializar todos os 7 dias com valores zerados
    for (let i = 6; i >= 0; i--) {
      const data = new Date();
      data.setDate(hoje.getDate() - i);
      const dataFormatada = data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      dadosPorDia[dataFormatada] = { data: dataFormatada, producao: 0, perdas: 0, percentualPerdas: 0 };
    }
    
    // Preencher com dados reais dos lançamentos
    lancamentos.forEach(lanc => {
      const data = new Date(lanc.data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (dadosPorDia[data]) {
        dadosPorDia[data].producao += parseFloat(lanc.producao_total) || 0;
        dadosPorDia[data].perdas += parseFloat(lanc.perdas_total) || 0;
      }
    });
    
    // Calcular percentual de perdas para cada dia
    Object.values(dadosPorDia).forEach(dia => {
      if (dia.producao > 0) {
        dia.percentualPerdas = parseFloat(((dia.perdas / dia.producao) * 100).toFixed(1));
      }
    });
    
    // Ordenar por data
    return Object.values(dadosPorDia).sort((a, b) => {
      const [diaA, mesA] = a.data.split('/');
      const [diaB, mesB] = b.data.split('/');
      const dataA = new Date(`2026-${mesA}-${diaA}`);
      const dataB = new Date(`2026-${mesB}-${diaB}`);
      return dataA - dataB;
    });
  };

  // Tooltip customizado para mostrar Produção primeiro
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // Encontrar os valores
      const producao = payload.find(p => p.dataKey === 'producao');
      const perdas = payload.find(p => p.dataKey === 'perdas');
      const percentual = payload.find(p => p.dataKey === 'percentualPerdas');
      
      return (
        <div style={{
          background: 'white',
          padding: '10px 14px',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#1a202c' }}>{label}</p>
          {producao && (
            <p style={{ margin: '4px 0', color: producao.color, fontWeight: '500' }}>
              Produção: {formatarKg(producao.value)} kg
            </p>
          )}
          {perdas && (
            <p style={{ margin: '4px 0', color: perdas.color, fontWeight: '500' }}>
              Perdas: {formatarKg(perdas.value)} kg
            </p>
          )}
          {percentual && (
            <p style={{ margin: '4px 0', color: percentual.color, fontWeight: '600' }}>
              % Perdas: {percentual.value}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <div className="loading">Carregando...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Visão geral da produção mensal</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Produção Total</h3>
          <div className="value">{formatarKg(stats?.producao_total || 0)} kg</div>
          <div className="subtitle" style={{fontSize: '15px', fontWeight: '600', color: '#4a5568'}}>
            <Package size={16} style={{display: 'inline', marginRight: '5px'}} />
            {stats?.dias_produzidos || 0} dias produzidos
          </div>
        </div>

        <div className="stat-card">
          <h3>Média Diária</h3>
          <div className="value">{formatarKg(stats?.media_diaria || 0)} kg</div>
          <div className="subtitle" style={{fontSize: '15px', fontWeight: '600', color: '#4a5568'}}>
            <TrendingUp size={16} style={{display: 'inline', marginRight: '5px'}} />
            Por dia produzido
          </div>
        </div>

        <div className="stat-card">
          <h3>Perdas Totais</h3>
          <div className="value">{formatarKg(stats?.perdas_total || 0)} kg</div>
          <div className="subtitle" style={{fontSize: '15px', fontWeight: '600', color: '#4a5568'}}>
            <AlertCircle size={16} style={{display: 'inline', marginRight: '5px'}} />
            {stats?.percentual_perdas || 0}% da produção
          </div>
        </div>

        <div className="stat-card">
          <h3>Período</h3>
          <div className="value" style={{fontSize: '24px'}}>Mensal</div>
          <div className="subtitle" style={{fontSize: '13px', fontWeight: '600', color: '#4a5568'}}>
            <Calendar size={14} style={{display: 'inline', marginRight: '5px'}} />
            {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^./, c => c.toUpperCase())}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 style={{marginBottom: '20px'}}>Produção x Perdas (Últimos 7 Dias)</h2>
        
        {lancamentos.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={prepararDadosGrafico()} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="data" 
                tick={{ fontSize: 11 }}
                interval={0}
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis 
                yAxisId="left"
                tick={{ fontSize: 11 }}
                label={{ value: 'kg', angle: -90, position: 'insideLeft', fontSize: 11 }} 
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11 }}
                label={{ value: '%', angle: 90, position: 'insideRight', fontSize: 11 }}
                domain={[0, 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="producao" 
                stroke="#15803d" 
                strokeWidth={2}
                name="Produção (kg)"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="perdas" 
                stroke="#f56565" 
                strokeWidth={2}
                name="Perdas (kg)"
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="percentualPerdas" 
                stroke="#805ad5" 
                strokeWidth={2}
                strokeDasharray="5 5"
                name="% Perdas"
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty-state">
            <p>Sem dados para exibir no gráfico</p>
          </div>
        )}
      </div>


    </div>
  );
}

export default Dashboard;
