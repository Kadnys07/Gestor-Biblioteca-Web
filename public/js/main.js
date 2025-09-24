function setupTableFilter(tableId, searchInputId, statusFilterId) {
    const searchInput = document.getElementById(searchInputId);
    const statusSelect = statusFilterId ? document.getElementById(statusFilterId) : null;
    const tableRows = document.querySelectorAll(`#${tableId} tbody tr`);

    function filterRows() {
        const searchTerm = searchInput.value.toLowerCase();
        const statusTerm = statusSelect ? statusSelect.value : 'todos';

        tableRows.forEach(row => {
            const searchData = (row.dataset.search || '').toLowerCase();
            const statusData = row.dataset.status || '';

            const matchesSearch = searchData.includes(searchTerm);
            const matchesStatus = (statusTerm === 'todos') || (statusData === statusTerm);

            if (matchesSearch && matchesStatus) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    if (searchInput) searchInput.addEventListener('input', filterRows);
    if (statusSelect) statusSelect.addEventListener('change', filterRows);
}

// Inicialização para cada página
document.addEventListener('DOMContentLoaded', () => {
    // Configura o filtro da tabela de livros, se ela existir
    if (document.getElementById('tabela-livros')) {
        setupTableFilter('tabela-livros', 'livro-search', 'livro-status-filter');
    }
    // Configura o filtro da tabela de leitores, se ela existir
    if (document.getElementById('tabela-leitores')) {
        setupTableFilter('tabela-leitores', 'leitor-search', null);
    }
    // Configura o filtro da tabela de empréstimos, se ela existir
    if (document.getElementById('tabela-emprestimos')) {
        setupTableFilter('tabela-emprestimos', 'emprestimo-search', 'emprestimo-status-filter');
    }
});

// MODAL DE LIVROS
window.abrirModalLivro = function(livro, idx) {
    document.getElementById('edit-livro-id').value = idx;
    document.getElementById('edit-livro-nome').value = livro.titulo;
    document.getElementById('edit-livro-autor').value = livro.autor;
    document.getElementById('edit-livro-genero').value = livro.genero;
    document.getElementById('edit-livro-qntd').value = livro.disponivel;
    document.getElementById('edit-livro-modal').classList.remove('hidden');
};
window.closeEditLivroModal = function() {
    document.getElementById('edit-livro-modal').classList.add('hidden');
};

// MODAL DE LEITORES
window.abrirModalLeitor = function(leitor, idx) {
    document.getElementById('edit-leitor-id').value = idx;
    document.getElementById('edit-leitor-nome-completo').value = leitor.nome;
    document.getElementById('edit-leitor-cpf').value = leitor.cpf;
    document.getElementById('edit-leitor-nascimento').value = leitor.nascimento || '';
    document.getElementById('edit-leitor-celular').value = leitor.celular || '';
    document.getElementById('edit-leitor-email').value = leitor.email;
    document.getElementById('edit-leitor-cep').value = leitor.cep || '';
    document.getElementById('edit-leitor-endereco').value = leitor.endereco || '';
    document.getElementById('edit-leitor-modal').classList.remove('hidden');
};
window.closeEditLeitorModal = function() {
    document.getElementById('edit-leitor-modal').classList.add('hidden');
};

// MODAL DE EMPRÉSTIMOS
window.abrirModalEmprestimo = function(emp, idx) {
    document.getElementById('edit-emprestimo-id').value = idx;
    document.getElementById('modal-livro-info').textContent = emp.livro;
    document.getElementById('modal-leitor-info').textContent = emp.leitor;
    document.getElementById('edit-data-inicio').value = emp.dataInicio || '';
    document.getElementById('edit-data-devolucao').value = emp.devolucao;
    document.getElementById('edit-status').value = emp.status;
    document.getElementById('edit-emprestimo-modal').classList.remove('hidden');
};
window.closeEditEmprestimoModal = function() {
    document.getElementById('edit-emprestimo-modal').classList.add('hidden');
};


// --- LÓGICA PARA SALVAR EDIÇÕES ---

// Tenta encontrar o formulário de edição de livros
const formEditLivro = document.getElementById('edit-livro-form');
// SÓ adiciona o listener SE o formulário existir na página atual
if (formEditLivro) {
    formEditLivro.addEventListener('submit', function(event) {
        event.preventDefault();
        const id = document.getElementById('edit-livro-id').value;
        const titulo = document.getElementById('edit-livro-nome').value;
        const autor = document.getElementById('edit-livro-autor').value;
        const genero = document.getElementById('edit-livro-genero').value;
        const disponivel = document.getElementById('edit-livro-qntd').value;
        
        fetch('/livros/editar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, titulo, autor, genero, disponivel })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.reload();
            } else {
                alert('Erro ao atualizar o livro: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Erro na requisição:', error);
            alert('Ocorreu um erro de comunicação com o servidor.');
        });
    });
}

// Tenta encontrar o formulário de edição de leitores
const formEditLeitor = document.getElementById('edit-leitor-form');
// SÓ adiciona o listener SE o formulário existir na página atual
if (formEditLeitor) {
    formEditLeitor.addEventListener('submit', function(event) {
        event.preventDefault();
        const id = document.getElementById('edit-leitor-id').value;
        const nome = document.getElementById('edit-leitor-nome-completo').value;
        const cpf = document.getElementById('edit-leitor-cpf').value;
        const nascimento = document.getElementById('edit-leitor-nascimento').value;
        const celular = document.getElementById('edit-leitor-celular').value;
        const email = document.getElementById('edit-leitor-email').value;
        const cep = document.getElementById('edit-leitor-cep').value;
        const endereco = document.getElementById('edit-leitor-endereco').value;
        
        const dadosParaEnviar = { id, nome, cpf, nascimento, celular, email, cep, endereco };
        console.log("Dados que serão enviados para o servidor:", dadosParaEnviar); 
        
        fetch('/leitores/editar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosParaEnviar)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.reload();
            } else {
                alert('Erro ao atualizar o leitor: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Erro na requisição:', error);
            alert('Ocorreu um erro de comunicação com o servidor.');
        });
    });
}

// Tenta encontrar o formulário de edição de empréstimos
const formEditEmprestimo = document.getElementById('edit-emprestimo-form');
// SÓ adiciona o listener SE o formulário existir na página atual
if (formEditEmprestimo) {
    formEditEmprestimo.addEventListener('submit', function(event) {
        event.preventDefault();
        const id = document.getElementById('edit-emprestimo-id').value;
        const devolucao = document.getElementById('edit-data-devolucao').value;
        const status = document.getElementById('edit-status').value;

        fetch('/emprestimos/editar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, devolucao, status })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.reload();
            } else {
                alert('Erro ao atualizar o empréstimo: ' + data.message);
            }       
        })
        .catch(error => {
            console.error('Erro na requisição:', error);
            alert('Ocorreu um erro de comunicação com o servidor.');
        }); 
    });
}
