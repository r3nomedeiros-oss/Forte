from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from supabase import create_client, Client
import jwt
import hashlib


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Supabase connection
supabase_url = os.environ['SUPABASE_URL']
supabase_key = os.environ['SUPABASE_KEY']
supabase: Client = create_client(supabase_url, supabase_key)

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Auth Models
class UserRegister(BaseModel):
    nome: str
    email: str
    senha: str
    tipo: str = "Operador"

class UserLogin(BaseModel):
    email: str
    senha: str

class User(BaseModel):
    id: str
    nome: str
    email: str
    tipo: str

# Variables Models
class VariableCreate(BaseModel):
    tipo: str  # 'turno', 'formato', 'cor'
    nome: str

class Variable(BaseModel):
    id: str
    tipo: str
    nome: str
    created_at: str
    ordem: Optional[int] = None

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_obj = StatusCheck(
        id=str(uuid.uuid4()),
        client_name=input.client_name,
        timestamp=datetime.now(timezone.utc)
    )
    
    # Convert to dict for Supabase
    doc = {
        "id": status_obj.id,
        "client_name": status_obj.client_name,
        "timestamp": status_obj.timestamp.isoformat()
    }
    
    try:
        result = supabase.table("status_checks").insert(doc).execute()
        return status_obj
    except Exception as e:
        logger.error(f"Error inserting status check: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    try:
        response = supabase.table("status_checks").select("*").execute()
        
        # Convert ISO string timestamps back to datetime objects
        status_checks = []
        for check in response.data:
            if isinstance(check['timestamp'], str):
                check['timestamp'] = datetime.fromisoformat(check['timestamp'].replace('Z', '+00:00'))
            status_checks.append(StatusCheck(**check))
        
        return status_checks
    except Exception as e:
        logger.error(f"Error fetching status checks: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Authentication endpoints
@api_router.post("/auth/register")
async def register_user(user_data: UserRegister):
    try:
        # Hash password
        password_hash = hashlib.sha256(user_data.senha.encode()).hexdigest()
        
        # Create user object
        user_doc = {
            "id": str(uuid.uuid4()),
            "nome": user_data.nome,
            "email": user_data.email,
            "senha": password_hash,
            "tipo": user_data.tipo,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Insert into Supabase
        result = supabase.table("users").insert(user_doc).execute()
        
        return {"message": "Usuário cadastrado com sucesso!", "user_id": user_doc["id"]}
    except Exception as e:
        logger.error(f"Error registering user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/auth/login")
async def login_user(login_data: UserLogin):
    try:
        # Hash password for comparison
        password_hash = hashlib.sha256(login_data.senha.encode()).hexdigest()
        
        # Query user from Supabase
        response = supabase.table("users").select("*").eq("email", login_data.email).eq("senha", password_hash).execute()
        
        if not response.data:
            raise HTTPException(status_code=401, detail="Credenciais inválidas")
        
        user = response.data[0]
        
        # Create simple token (in production, use proper JWT)
        token = f"token_{user['id']}_{datetime.now().timestamp()}"
        
        return {
            "token": token,
            "user": {
                "id": user["id"],
                "nome": user["nome"],
                "email": user["email"],
                "tipo": user["tipo"]
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error logging in user: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== VARIABLES ENDPOINTS ====================

@api_router.get("/variaveis", response_model=List[Variable])
async def listar_variaveis():
    """List all variables (turnos, formatos, cores)"""
    try:
        response = supabase.table("variaveis").select("*").order("tipo").order("ordem", nullsfirst=False).order("nome").execute()
        return response.data
    except Exception as e:
        logger.error(f"Error fetching variables: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/variaveis", response_model=Variable, status_code=201)
async def criar_variavel(variable_data: VariableCreate):
    """Create a new variable"""
    try:
        # Check if variable already exists
        existing = supabase.table("variaveis").select("*").eq("tipo", variable_data.tipo).eq("nome", variable_data.nome).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="Variável já existe")
        
        # Create new variable
        variavel = {
            "id": str(uuid.uuid4()),
            "tipo": variable_data.tipo,
            "nome": variable_data.nome,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Insert into Supabase
        result = supabase.table("variaveis").insert(variavel).execute()
        return variavel
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating variable: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/variaveis/{variavel_id}")
async def deletar_variavel(variavel_id: str):
    """Delete a variable by ID"""
    try:
        result = supabase.table("variaveis").delete().eq("id", variavel_id).execute()
        return {"success": True}
    except Exception as e:
        logger.error(f"Error deleting variable: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/variaveis/ordem")
async def atualizar_ordem_variaveis(data: dict):
    """Update the order of variables"""
    try:
        variaveis = data.get("variaveis", [])
        for item in variaveis:
            supabase.table("variaveis").update({"ordem": item["ordem"]}).eq("id", item["id"]).execute()
        return {"success": True}
    except Exception as e:
        logger.error(f"Error updating variables order: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== LANCAMENTOS ENDPOINTS ====================

class ItemLancamento(BaseModel):
    formato: str
    cor: str
    pacote_kg: float = 0
    producao_kg: float = 0

class LancamentoCreate(BaseModel):
    data: str
    turno: str
    hora: str
    orelha_kg: float = 0
    aparas_kg: float = 0
    referencia_producao: Optional[str] = ""
    referencia_lote: Optional[str] = ""
    itens: List[ItemLancamento] = []

@api_router.post("/lancamentos")
async def criar_lancamento(lancamento: LancamentoCreate):
    """Create a new production entry"""
    try:
        lancamento_id = str(uuid.uuid4())
        
        itens_list = [
            {
                "formato": item.formato,
                "cor": item.cor,
                "pacote_kg": item.pacote_kg,
                "producao_kg": item.producao_kg
            } for item in lancamento.itens
        ]
        
        producao_total = sum(item.producao_kg for item in lancamento.itens)
        perdas_total = lancamento.orelha_kg + lancamento.aparas_kg
        
        lancamento_doc = {
            "id": lancamento_id,
            "data": lancamento.data,
            "turno": lancamento.turno,
            "hora": lancamento.hora,
            "orelha_kg": lancamento.orelha_kg,
            "aparas_kg": lancamento.aparas_kg,
            "referencia_producao": lancamento.referencia_producao,
            "referencia_lote": lancamento.referencia_lote,
            "itens": itens_list,
            "producao_total": producao_total,
            "perdas_total": perdas_total
        }
        
        supabase.table("lancamentos").insert(lancamento_doc).execute()
        return {"success": True, "id": lancamento_id}
    except Exception as e:
        logger.error(f"Error creating lancamento: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/lancamentos")
async def listar_lancamentos(data_inicio: Optional[str] = None, data_fim: Optional[str] = None):
    """List all production entries"""
    try:
        query = supabase.table("lancamentos").select("*")
        
        if data_inicio:
            query = query.gte("data", data_inicio)
        if data_fim:
            query = query.lte("data", data_fim)
            
        response = query.order("data", desc=True).order("hora", desc=True).execute()
        lancamentos = response.data
        
        if not lancamentos:
            return []
        
        result = []
        for lanc in lancamentos:
            producao_total = float(lanc.get('producao_total') or 0)
            perdas_total = float(lanc.get('perdas_total') or 0)
            percentual_perdas = (perdas_total / producao_total * 100) if producao_total > 0 else 0
            
            result.append({
                **lanc,
                'percentual_perdas': round(percentual_perdas, 2)
            })
        
        return result
    except Exception as e:
        logger.error(f"Error listing lancamentos: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/lancamentos/{lancamento_id}")
async def obter_lancamento(lancamento_id: str):
    """Get a specific production entry"""
    try:
        response = supabase.table("lancamentos").select("*").eq("id", lancamento_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Lançamento não encontrado")
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting lancamento: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/lancamentos/{lancamento_id}")
async def atualizar_lancamento(lancamento_id: str, lancamento: LancamentoCreate):
    """Update a production entry"""
    try:
        itens_list = [
            {
                "formato": item.formato,
                "cor": item.cor,
                "pacote_kg": item.pacote_kg,
                "producao_kg": item.producao_kg
            } for item in lancamento.itens
        ]
        
        producao_total = sum(item.producao_kg for item in lancamento.itens)
        perdas_total = lancamento.orelha_kg + lancamento.aparas_kg
        
        lancamento_update = {
            "data": lancamento.data,
            "turno": lancamento.turno,
            "hora": lancamento.hora,
            "orelha_kg": lancamento.orelha_kg,
            "aparas_kg": lancamento.aparas_kg,
            "referencia_producao": lancamento.referencia_producao,
            "referencia_lote": lancamento.referencia_lote,
            "itens": itens_list,
            "producao_total": producao_total,
            "perdas_total": perdas_total
        }
        
        supabase.table("lancamentos").update(lancamento_update).eq("id", lancamento_id).execute()
        return {"success": True}
    except Exception as e:
        logger.error(f"Error updating lancamento: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/lancamentos/{lancamento_id}")
async def deletar_lancamento(lancamento_id: str):
    """Delete a production entry"""
    try:
        supabase.table("lancamentos").delete().eq("id", lancamento_id).execute()
        return {"success": True}
    except Exception as e:
        logger.error(f"Error deleting lancamento: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ==================== RELATORIOS ENDPOINTS ====================

@api_router.get("/relatorios")
async def gerar_relatorio(
    periodo: str = "mensal",
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    referencia_producao: Optional[str] = None
):
    """Generate production report"""
    try:
        from datetime import timedelta
        hoje = datetime.now(timezone.utc).date()
        
        # Calculate date range based on period
        if not data_inicio or not data_fim:
            if periodo == 'semanal':
                dias_desde_domingo = (hoje.weekday() + 1) % 7
                data_inicio = (hoje - timedelta(days=dias_desde_domingo)).isoformat()
                data_fim = (hoje + timedelta(days=(6 - dias_desde_domingo))).isoformat()
            elif periodo == 'mensal':
                data_inicio = hoje.replace(day=1).isoformat()
                if hoje.month == 12:
                    data_fim = hoje.replace(day=31).isoformat()
                else:
                    proximo_mes = hoje.replace(month=hoje.month + 1, day=1)
                    data_fim = (proximo_mes - timedelta(days=1)).isoformat()
            elif periodo == 'anual':
                data_inicio = hoje.replace(month=1, day=1).isoformat()
                data_fim = hoje.replace(month=12, day=31).isoformat()
        
        # Query lancamentos
        query = supabase.table("lancamentos").select("*")
        if data_inicio and data_fim:
            query = query.gte("data", data_inicio).lte("data", data_fim)
        if referencia_producao:
            query = query.ilike("referencia_producao", f"%{referencia_producao}%")
        
        response = query.execute()
        lancamentos = response.data
        
        if not lancamentos:
            return {
                "producao_total": 0,
                "perdas_total": 0,
                "percentual_perdas": 0,
                "dias_produzidos": 0,
                "media_diaria": 0,
                "data_inicio": data_inicio,
                "data_fim": data_fim,
                "por_referencia": {},
                "por_item": []
            }
        
        producao_total = 0
        perdas_total = 0
        dias_unicos = set()
        stats_ref = {}
        stats_itens = {}
        
        for lanc in lancamentos:
            prod_lanc = float(lanc.get('producao_total') or 0)
            perd_lanc = float(lanc.get('perdas_total') or 0)
            ref = lanc.get('referencia_producao') or 'Sem Referência'
            
            producao_total += prod_lanc
            perdas_total += perd_lanc
            dias_unicos.add(lanc['data'])
            
            # Stats by reference
            if ref not in stats_ref:
                stats_ref[ref] = {"prod": 0, "perd": 0, "dias": set()}
            stats_ref[ref]["prod"] += prod_lanc
            stats_ref[ref]["perd"] += perd_lanc
            stats_ref[ref]["dias"].add(lanc['data'])
            
            # Stats by item (Format + Color)
            itens_lanc = lanc.get('itens', [])
            if isinstance(itens_lanc, list):
                for item in itens_lanc:
                    formato = item.get('formato', 'N/A')
                    cor = item.get('cor', 'N/A')
                    chave_item = f"{formato} - {cor}"
                    prod_item = float(item.get('producao_kg') or 0)
                    
                    if chave_item not in stats_itens:
                        stats_itens[chave_item] = {"formato": formato, "cor": cor, "producao": 0}
                    stats_itens[chave_item]["producao"] += prod_item
        
        dias_total = len(dias_unicos)
        
        relatorio = {
            "producao_total": round(producao_total, 2),
            "perdas_total": round(perdas_total, 2),
            "percentual_perdas": round((perdas_total / producao_total * 100) if producao_total > 0 else 0, 2),
            "dias_produzidos": dias_total,
            "media_diaria": round(producao_total / dias_total if dias_total > 0 else 0, 2),
            "data_inicio": data_inicio,
            "data_fim": data_fim,
            "por_referencia": {
                ref: {
                    "producao": round(s["prod"], 2),
                    "perdas": round(s["perd"], 2),
                    "dias_produzidos": len(s["dias"]),
                    "media_diaria": round(s["prod"] / len(s["dias"]) if s["dias"] else 0, 2),
                    "percentual_perdas": round((s["perd"] / s["prod"] * 100) if s["prod"] > 0 else 0, 2)
                } for ref, s in stats_ref.items()
            },
            "por_item": [
                {
                    "item": chave,
                    "formato": dados["formato"],
                    "cor": dados["cor"],
                    "producao": round(dados["producao"], 2)
                } for chave, dados in sorted(stats_itens.items(), key=lambda x: x[1]['producao'], reverse=True)
            ]
        }
        
        return relatorio
    except Exception as e:
        logger.error(f"Error generating report: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
