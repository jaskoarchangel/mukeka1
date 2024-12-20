import { deleteDoc, getDocs, collection, doc, getDoc, addDoc } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js';
import { storage, firestore } from './firebase-config.js';
import {  signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';


const defaultCoverUrl = 'https://firebasestorage.googleapis.com/v0/b/mukekajasko.appspot.com/o/covers%2Fdefault.jpg?alt=media';

let searchActive = false; // Flag para controlar se a pesquisa está ativa
let musicOffset = 0; // Controla o ponto de onde pegar as músicas

// Função para obter o parâmetro "userId" da URL
const getUserIdFromURL = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('userId');
};
// Função para exibir a lista de músicas
export const displayMusicList = (musicData) => {
    const musicList = document.getElementById('music-list');
    musicList.innerHTML = ''; // Limpa a lista antes de adicionar as músicas

    musicData.forEach((data) => appendMusicItem(data, musicList));
};

// Função para adicionar item à lista de músicas
const appendMusicItem = (data, musicList) => {
    const musicItem = document.createElement('div');
    musicItem.className = 'music-item';
    musicItem.dataset.id = data.id;

    const coverImage = document.createElement('img');
    coverImage.src = data.coverUrl || defaultCoverUrl;
    coverImage.className = 'cover-image';
    coverImage.dataset.audioUrl = data.mp3Url || data.wavUrl;
    coverImage.addEventListener('click', () => displayMusicDetails(data));

    musicItem.appendChild(coverImage);
    musicList.appendChild(musicItem);
};

// Função para embaralhar a lista de músicas (algoritmo de Fisher-Yates)
const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // Troca os elementos
    }
    return array;
};



// Função para buscar e exibir músicas com limite de 16 e alternando o conjunto de músicas
export const fetchAndDisplayMusic = async () => {
    const userId = getUserIdFromURL(); // Obtém o userId da URL
    if (!userId) {
        console.log("User ID não encontrado na URL.");
        return;
    }

    try {
        // Marca que a pesquisa foi feita
        searchActive = true;

        // Busca as músicas que pertencem ao usuário específico
        const querySnapshot = await getDocs(collection(firestore, 'uploads'));
        const musicData = [];

        querySnapshot.forEach((docSnapshot) => {
            const data = { id: docSnapshot.id, ...docSnapshot.data() };

            // Verifica se a música pertence ao usuário atual
            if (data.userId === userId) {
                musicData.push(data); // Adiciona à lista de músicas do usuário
            }
        });

        // Embaralha a lista de músicas antes de exibir
        const shuffledMusicData = shuffleArray(musicData);

        // Limita a 16 músicas
        const limitedMusicData = shuffledMusicData.slice(musicOffset, musicOffset + 16);

        // Atualiza o offset para o próximo conjunto de músicas
        musicOffset += 16;

        // Exibe as músicas
        displayMusicList(limitedMusicData);

    } catch (error) {
        console.error('Erro ao buscar músicas:', error);
    }
};


// Função para buscar nome, contato e foto de perfil do usuário
const fetchUserDetails = async (userId) => {
    try {
        const userDoc = await getDoc(doc(firestore, 'users', userId));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            const userName = userData.name || "Usuário Desconhecido";
            const userContact = userData.contact || "Contato não disponível";
            const userProfilePic = userData.profilePicture || 'default2.jpg';  // Foto padrão se não houver

            return { userName, userContact, userProfilePic };
        } else {
            return { userName: "Usuário Desconhecido", userContact: "Contato não encontrado", userProfilePic: 'default2.jpg' };
        }
    } catch (error) {
        console.error("Erro ao buscar detalhes do usuário:", error);
        return { userName: "Erro ao buscar usuário", userContact: "Erro ao buscar contato", userProfilePic: 'default2.jpg' };
    }
};



export const displayMusicDetails = (data) => {
    document.getElementById('music-title').textContent = data.title;
    document.getElementById('music-type').textContent = data.type;
    document.getElementById('music-bpm').textContent = data.bpm;
    document.getElementById('music-note').textContent = data.note;
    document.getElementById('music-scale').textContent = data.scale;
    document.getElementById('music-price').textContent = data.price;
    document.getElementById('music-pix-key').textContent = data.pixKey;
    document.getElementById('music-cover').src = data.coverUrl || defaultCoverUrl;

    // Atualiza o player de música
    const audioPlayer = document.getElementById('music-player');
    const audioSource = document.getElementById('music-player-source');
    audioSource.src = data.mp3Url || data.wavUrl || '';
    audioPlayer.load(); // Recarrega o player com a nova música
    audioPlayer.play(); // Reproduz a música automaticamente

    fetchUserDetails(data.userId).then(({ userName, userContact, userProfilePic }) => {
        const usernameElement = document.getElementById('music-username');
        usernameElement.textContent = ``;

        const userLink = document.createElement('a');
        userLink.href = `../user/index.html?userId=${data.userId}`;
        userLink.textContent = userName;
        userLink.style.textDecoration = "none";
        userLink.style.color = "#007bff";
        usernameElement.appendChild(userLink);

        document.getElementById('music-contact').textContent = `${userContact}`;
        document.getElementById('music-profile-pic').src = userProfilePic;

        // Adicionando evento de clique na foto de perfil para redirecionar
        const profilePicElement = document.getElementById('music-profile-pic');
        profilePicElement.addEventListener('click', () => {
            window.location.href = `../user/index.html?userId=${data.userId}`;  // Redireciona para a página do perfil do usuário
        });
    });


    // Verifica se o usuário logado é o mesmo que o dono da música
    const auth = getAuth();
    const user = auth.currentUser;

    // Identifica os botões
    const buyButton = document.getElementById('buy-button');
    const editButton = document.getElementById('edit-music-button');

    if (user && user.uid === data.userId) {
        // Se for o mesmo usuário, mostra o botão de editar e esconde o de comprar
        buyButton.style.display = 'none';  // Torna o botão de comprar invisível
        editButton.style.display = 'block'; // Torna o botão de editar visível

        // Adiciona o evento de clique no botão de editar para excluir a música
        editButton.addEventListener('click', () => {
            const musicId = data.id; // ID do documento da música que será excluído
            deleteMusic(musicId);  // Chama a função para deletar a música
        });

    } else {
        // Caso contrário, esconde o botão de editar e mostra o de comprar
        buyButton.style.display = 'block';  // Torna o botão de comprar visível
        editButton.style.display = 'none';  // Torna o botão de editar invisível
    }

    // Exibe o modal de detalhes da música
    document.getElementById("musicDataModal").classList.add("show");
};

// Função para excluir a música do Firestore
const deleteMusic = async (musicId) => {
    try {
        const musicRef = doc(firestore, 'uploads', musicId); // Obtém a referência do documento da música
        await deleteDoc(musicRef);  // Deleta o documento
        showNotification("Excluido com sucesso!", 'error')
        
        // Recarrega a página após a exclusão
        window.location.reload();  // Isso recarregará a página, atualizando a interface
    } catch (error) {
        console.error("Erro ao excluir a música:", error);
    }
};


const displayUserInfo = async () => {
    const userId = getUserIdFromURL(); // Obtém o ID do usuário da URL

    if (!userId) {
        console.error("User ID não encontrado na URL.");
        return;
    }

    try {
        const userDetails = await fetchUserDetails(userId); // Busca os dados do Firestore

        // Atualiza o container com os dados do usuário
        document.getElementById('user-profile-pic').src = userDetails.userProfilePic;
        document.getElementById('user-name').textContent = userDetails.userName;
        document.getElementById('user-contact').textContent = userDetails.userContact;
    } catch (error) {
        console.error("Erro ao exibir informações do usuário:", error);
    }
};

// Chama a função para exibir as informações do usuário quando a página carregar
document.addEventListener('DOMContentLoaded', displayUserInfo);




function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;

    // Limpar qualquer classe de tipo anterior
    notification.classList.remove('success', 'error');

    // Adicionar a classe correspondente ao tipo
    if (type === 'success') {
        notification.classList.add('success');
    } else if (type === 'error') {
        notification.classList.add('error');
    }

    notification.classList.remove('hidden'); // Mostra a notificação
    setTimeout(() => {
        notification.classList.add('hidden'); // Esconde após 8 segundos
    }, 5000); // Duração de 8 segundos
}

// Espera o carregamento completo do DOM
document.addEventListener('DOMContentLoaded', function() {
    // Seleciona o botão "Comprar"
    const buyButton = document.getElementById('buy-button');
    
    // Adiciona um evento de clique ao botão "Comprar"
    buyButton.addEventListener('click', function() {
        // Obtém os dados do modal
        const username = document.getElementById('music-username').textContent;
        const price = document.getElementById('music-price').textContent;
        const pixKey = document.getElementById('music-pix-key').textContent;
        const contact = document.getElementById('music-contact').textContent;
        
        // Exibe os dados usando a notificação personalizada
        showNotification("No momento não há suporte a gateway de pagamento no MuKeKa. Envie " + price + "\n no PIX " + pixKey + "\n e entre em contato com " + username + "\n em " + contact + "\n para evitar qualquer transtorno. ")
 
    });
});























// Função para limpar o estado de pesquisa e permitir a exibição novamente sem filtros
export const clearSearch = () => {
    searchActive = false;
    // Chama novamente a função sem o filtro de pesquisa
    fetchAndDisplayMusic();
};



// Função para configurar os botões
const setupButtons = () => {
    // Obtém os botões de navegação
    const randomizeLeftButton = document.getElementById('randomize-left');
    const randomizeRightButton = document.getElementById('randomize-right');

    // Adiciona eventos aos botões
    randomizeLeftButton.addEventListener('click', () => {
        // Ao clicar, chama a função que exibe as músicas com o novo offset
        fetchAndDisplayMusic();
    });

    randomizeRightButton.addEventListener('click', () => {
        // Ao clicar, chama a função que exibe as músicas com o novo offset
        fetchAndDisplayMusic();
    });
};

// Chama a função de configuração dos botões quando a página estiver carregada
document.addEventListener('DOMContentLoaded', setupButtons);

// Função para adicionar música ao Firestore
export const uploadMusicToFirestore = async (musicData) => {
    try {
        await addDoc(collection(firestore, 'uploads'), musicData);
        console.log("Música enviada com sucesso!");
    } catch (error) {
        console.error("Erro ao enviar música:", error);
    }
};
