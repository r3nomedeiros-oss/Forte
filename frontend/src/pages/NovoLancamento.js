import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Trash2, Save } from 'lucide-react';

const API_URL = (process.env.REACT_APP_BACKEND_URL || '') + '/api';

function NovoLancamento() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [variaveis, setVariaveis] = useState({ turnos: [], formatos: [], cores: [] });
  
  const [lancamento, setLancamento] = useState({
    data: new Date().toISOString().split('T')[0],
    turno: '',
    hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    orelha_kg: '',
    aparas_kg: '',
    referencia_producao: '',
    itens: [
      { formato: '', cor: '', pacote_kg: '', producao_kg: '' }
    ]
  });

  // Carregar variáveis do sistema
  useEffect(() => {
    const carregarVariaveis = async () => {
      try {
        const response = await axios.get(`${API_URL}/variaveis`);
        const data = response.data;
        setVariaveis({
          turnos: data.filter(v => v.tipo === 'turno'),
          formatos: data.filter(v => v.tipo === 'formato'),
          cores: data.filter(v => v.tipo === 'cor')
        });
      } catch (error) {
        console.error('Erro ao carregar variáveis:', error);
      }
    };
    carregarVariaveis();
  }, []);

  // Atualizar hora automaticamente a cada minuto (sem segundos)
  useEffect(() => {
    const interval = setInterval(() => {
      setLancamento(prev => ({
        ...prev,
        hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      }));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const adicionarItem = () => {
    setLancamento({
      ...lancamento,
      itens: [...lancamento.itens, { formato: '', cor: '', pacote_kg: '', producao_kg: '' }]
    });
  };

  const removerItem = (index) => {
    const novosItens = lancamento.itens.filter((_, i) => i !== index);
    setLancamento({ ...lancamento, itens: novosItens });
  };

  const atualizarItem = (index, field, value) => {
    const novosItens = [...lancamento.itens];
    novosItens[index][field] = value;
    setLancamento({ ...lancamento, itens: novosItens });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await axios.post(`${API_URL}/lancamentos`, lancamento);
      alert('Lançamento criado com sucesso!');
      navigate('/lancamentos');
    } catch (error) {
      console.error('Erro ao criar lançamento:', error);
      alert('Erro ao criar lançamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Novo Lançamento</h1>
        <p>Registrar nova produção de sacolas</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <h2 style={{marginBottom: '20px'}}>Informações Gerais</h2>
          
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px'}}>
            <div className="form-group">
              <label>Data</label>
              <input
                type="date"
                className="form-control"
                value={lancamento.data}
                onChange={(e) => setLancamento({...lancamento, data: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>Turno</label>
              <select
                className="form-control"
                value={lancamento.turno}
                onChange={(e) => setLancamento({...lancamento, turno: e.target.value})}
                required
              >
                <option value="">Selecione o turno</option>
                {variaveis.turnos.map((t) => (
                  <option key={t.id} value={t.nome}>{t.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
            <div className="form-group">
              <label>Orelha (kg)</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                value={lancamento.orelha_kg}
                onChange={(e) => setLancamento({...lancamento, orelha_kg: e.target.value})}
                required
                placeholder="0,00"
              />
            </div>

            <div className="form-group">
              <label>Aparas (kg)</label>
              <input
                type="number"
                step="0.01"
                className="form-control"
                value={lancamento.aparas_kg}
                onChange={(e) => setLancamento({...lancamento, aparas_kg: e.target.value})}
                required
                placeholder="0,00"
              />
            </div>
          </div>

          <div style={{marginTop: '20px', padding: '15px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bcf0da'}}>
            <div className="form-group" style={{marginBottom: '0'}}>
              <label style={{fontWeight: '700', color: '#15803d', fontSize: '16px'}}>Referência de Produção</label>
              <input
                type="text"
                className="form-control"
                value={lancamento.referencia_producao}
                onChange={(e) => setLancamento({...lancamento, referencia_producao: e.target.value})}
                placeholder="Ex: Produção para Cliente X"
                style={{border: '2px solid #15803d', fontSize: '16px', fontWeight: '600'}}
                required
              />
              <p style={{fontSize: '12px', color: '#15803d', marginTop: '5px'}}>Destaque para que vai a produção</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
            <h2>Itens de Produção</h2>
            <button type="button" className="btn btn-secondary" onClick={adicionarItem}>
              <Plus size={16} /> Adicionar Item
            </button>
          </div>

          {lancamento.itens.map((item, index) => (
            <div key={index} className="item-producao-row" style={{background: '#f8fafc', padding: '12px', borderRadius: '8px', marginBottom: '10px', border: '1px solid #e2e8f0'}}>
              <div className="item-producao-grid">
                <div className="form-group" style={{marginBottom: '0'}}>
                  <label className="item-label">Formato</label>
                  <select
                    className="form-control item-input"
                    value={item.formato}
                    onChange={(e) => atualizarItem(index, 'formato', e.target.value)}
                    required
                  >
                    <option value="">Selecione</option>
                    {variaveis.formatos.map((f) => (
                      <option key={f.id} value={f.nome}>{f.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{marginBottom: '0'}}>
                  <label className="item-label">Cor</label>
                  <select
                    className="form-control item-input"
                    value={item.cor}
                    onChange={(e) => atualizarItem(index, 'cor', e.target.value)}
                    required
                  >
                    <option value="">Selecione</option>
                    {variaveis.cores.map((c) => (
                      <option key={c.id} value={c.nome}>{c.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{marginBottom: '0'}}>
                  <label className="item-label">Pacote (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control item-input"
                    value={item.pacote_kg}
                    onChange={(e) => atualizarItem(index, 'pacote_kg', e.target.value)}
                    required
                    placeholder="0,00"
                  />
                </div>

                <div className="form-group" style={{marginBottom: '0'}}>
                  <label className="item-label">Produção (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control item-input"
                    value={item.producao_kg}
                    onChange={(e) => atualizarItem(index, 'producao_kg', e.target.value)}
                    required
                    placeholder="0,00"
                  />
                </div>

                {lancamento.itens.length > 1 && (
                  <button
                    type="button"
                    className="btn btn-danger item-delete-btn"
                    onClick={() => removerItem(index)}
                    title="Remover item"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div style={{display: 'flex', gap: '10px'}}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Save size={16} /> {loading ? 'Salvando...' : 'Salvar Lançamento'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/lancamentos')}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

export default NovoLancamento;
