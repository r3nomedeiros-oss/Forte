import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Settings, RefreshCw } from 'lucide-react';

const API_URL = (process.env.REACT_APP_BACKEND_URL || '') + '/api';

function Variaveis() {
  const [variaveis, setVariaveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [novaVariavel, setNovaVariavel] = useState({ tipo: 'turno', nome: '' });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarVariaveis();
  }, []);

  const carregarVariaveis = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/variaveis`);
      setVariaveis(response.data);
    } catch (error) {
      console.error('Erro ao carregar variáveis:', error);
    } finally {
      setLoading(false);
    }
  };

  const adicionarVariavel = async (e) => {
    e.preventDefault();
    if (!novaVariavel.nome.trim()) {
      alert('Digite um nome para a variável');
      return;
    }

    setSalvando(true);
    try {
      await axios.post(`${API_URL}/variaveis`, novaVariavel);
      setNovaVariavel({ ...novaVariavel, nome: '' });
      carregarVariaveis();
    } catch (error) {
      if (error.response?.data?.error === 'Variável já existe') {
        alert('Esta variável já existe!');
      } else {
        console.error('Erro ao adicionar variável:', error);
        alert('Erro ao adicionar variável');
      }
    } finally {
      setSalvando(false);
    }
  };

  const deletarVariavel = async (id, nome) => {
    if (!window.confirm(`Tem certeza que deseja excluir "${nome}"?`)) return;

    try {
      await axios.delete(`${API_URL}/variaveis/${id}`);
      carregarVariaveis();
    } catch (error) {
      console.error('Erro ao deletar variável:', error);
      alert('Erro ao deletar variável');
    }
  };

  const turnos = variaveis.filter(v => v.tipo === 'turno');
  const formatos = variaveis.filter(v => v.tipo === 'formato');
  const cores = variaveis.filter(v => v.tipo === 'cor');

  const tipoLabels = {
    turno: 'Turno',
    formato: 'Formato',
    cor: 'Cor'
  };

  return (
    <div>
      <div className="page-header">
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
          <Settings size={32} style={{color: '#15803d'}} />
          <div>
            <h1>Variáveis do Sistema</h1>
            <p>Gerencie as opções de Turno, Formato e Cor</p>
          </div>
        </div>
        <button onClick={carregarVariaveis} className="btn btn-secondary" disabled={loading}>
          <RefreshCw size={16} className={loading ? 'spin' : ''} /> Atualizar
        </button>
      </div>

      {/* Formulário para adicionar */}
      <div className="card" style={{marginBottom: '20px'}}>
        <h2 style={{marginBottom: '15px'}}>Adicionar Nova Variável</h2>
        <form onSubmit={adicionarVariavel} style={{display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end'}}>
          <div className="form-group" style={{marginBottom: 0, minWidth: '150px'}}>
            <label>Tipo</label>
            <select
              className="form-control"
              value={novaVariavel.tipo}
              onChange={(e) => setNovaVariavel({ ...novaVariavel, tipo: e.target.value })}
            >
              <option value="turno">Turno</option>
              <option value="formato">Formato</option>
              <option value="cor">Cor</option>
            </select>
          </div>
          
          <div className="form-group" style={{marginBottom: 0, flex: 1, minWidth: '200px'}}>
            <label>Nome</label>
            <input
              type="text"
              className="form-control"
              value={novaVariavel.nome}
              onChange={(e) => setNovaVariavel({ ...novaVariavel, nome: e.target.value })}
              placeholder={`Ex: ${novaVariavel.tipo === 'turno' ? 'Manhã' : novaVariavel.tipo === 'formato' ? '30x40' : 'Azul'}`}
            />
          </div>
          
          <button type="submit" className="btn btn-primary" disabled={salvando}>
            <Plus size={16} /> {salvando ? 'Salvando...' : 'Adicionar'}
          </button>
        </form>
      </div>

      {loading ? (
        <div className="loading">Carregando variáveis...</div>
      ) : (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px'}}>
          {/* Card de Turnos */}
          <div className="card">
            <h2 style={{marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px'}}>
              <span style={{background: '#dcfce7', padding: '8px', borderRadius: '8px'}}>🕐</span>
              Turnos
              <span style={{background: '#e2e8f0', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', marginLeft: 'auto'}}>
                {turnos.length}
              </span>
            </h2>
            {turnos.length === 0 ? (
              <p style={{color: '#64748b', fontSize: '14px'}}>Nenhum turno cadastrado</p>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                {turnos.map((v) => (
                  <div key={v.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
                    <span style={{fontWeight: '500'}}>{v.nome}</span>
                    <button
                      onClick={() => deletarVariavel(v.id, v.nome)}
                      className="btn btn-danger"
                      style={{padding: '6px 10px', fontSize: '12px'}}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card de Formatos */}
          <div className="card">
            <h2 style={{marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px'}}>
              <span style={{background: '#dbeafe', padding: '8px', borderRadius: '8px'}}>📐</span>
              Formatos
              <span style={{background: '#e2e8f0', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', marginLeft: 'auto'}}>
                {formatos.length}
              </span>
            </h2>
            {formatos.length === 0 ? (
              <p style={{color: '#64748b', fontSize: '14px'}}>Nenhum formato cadastrado</p>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                {formatos.map((v) => (
                  <div key={v.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
                    <span style={{fontWeight: '500'}}>{v.nome}</span>
                    <button
                      onClick={() => deletarVariavel(v.id, v.nome)}
                      className="btn btn-danger"
                      style={{padding: '6px 10px', fontSize: '12px'}}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card de Cores */}
          <div className="card">
            <h2 style={{marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px'}}>
              <span style={{background: '#fef3c7', padding: '8px', borderRadius: '8px'}}>🎨</span>
              Cores
              <span style={{background: '#e2e8f0', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', marginLeft: 'auto'}}>
                {cores.length}
              </span>
            </h2>
            {cores.length === 0 ? (
              <p style={{color: '#64748b', fontSize: '14px'}}>Nenhuma cor cadastrada</p>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                {cores.map((v) => (
                  <div key={v.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
                    <span style={{fontWeight: '500'}}>{v.nome}</span>
                    <button
                      onClick={() => deletarVariavel(v.id, v.nome)}
                      className="btn btn-danger"
                      style={{padding: '6px 10px', fontSize: '12px'}}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default Variaveis;
