var express = require("express");
var app = express();
var server = require("http").Server(app);
var router = express.Router();

app.get("/",function (req, res) {
    res.sendFile(__dirname + "/client/Lobby.html");
});
app.get("/game", function (req, res) {
    res.sendFile(__dirname + "/client/Game.html");
});
app.use("/client",express.static(__dirname + "/client"));

server.listen(6070);

console.log("Server started on port 6070");


var SOCKET_LIST = {};
var PLAYER_LIST = {};
var POSITIONS = {};
var playerCount = 0;
var lobbyCount = 0;
var index = 0;
var isInGame = false;

var Player = function (id) {
    var self = {
        id:id,
        position:0,
        ownedCards:{},
    }
    return self;
}

var io = require("socket.io")(server,{});
io.on("connection", socket => {
    socket.join("room");
});

io.sockets.on("connection",function (socket) {

    if(playerCount >= 6) {
        socket.disconnect();
    }
    console.log("Socket connected");
    socket.id = index;
    index++;
    var POSITION = getNextFreePos();
    playerCount++;
    POSITIONS[POSITION] = POSITION;
    var player = Player(socket.id);
    player.position = POSITION;
    PLAYER_LIST[socket.id] = player;
    SOCKET_LIST[socket.id] = socket;
    socket.emit("ownPosition", player.position);
    for(var p in SOCKET_LIST) {
        SOCKET_LIST[p].emit("clearTable");
        for(var a in PLAYER_LIST) {
            SOCKET_LIST[p].emit("playerCon",PLAYER_LIST[a].position);
        }
    }

    //when in Game connection
    if(isInGame) {
        for(var p in SOCKET_LIST) {
            SOCKET_LIST[p].emit("setPlayerCount", playerCount);
        }
        socket.emit("setup");
        if(playerCount === lobbyCount) {
            io.to("room").emit("setPlayers");
            //SOCKET_LIST[Math.floor(Math.random() * playerCount)].emit("myTurn", true);
        }
    }


    //when disconnected
    socket.on("disconnect",function () {
        console.log("Socket Disconnected");
        delete SOCKET_LIST[socket.id];
        delete PLAYER_LIST[socket.id];
        delete POSITIONS[socket.id];
        playerCount--;
        calcNewPos();
        /*for(var p in SOCKET_LIST) {
            SOCKET_LIST[p].emit("playerDis",player.position);
        }*/
    });


    //when button is pressed
    socket.on("dealCards",function () {
        dealCards();
    });

    //when play is pressed
    socket.on("startGame", function () {
        startGame();
    });

    socket.on("playCard", function (card, owner) {
        io.to("room").emit("cardOnDesk", card);
        io.to("room").emit("cardBackRemove", owner);
    });

});

function calcNewPos() {

    var index = 0;
    for(var p in POSITIONS) {
        delete POSITIONS[p];
    }
    for(var p in PLAYER_LIST) {
        PLAYER_LIST[p].position = index;
        POSITIONS[index] = index;
        index++;
    }
    for(var p in SOCKET_LIST) {
        SOCKET_LIST[p].emit("clearTable");
        SOCKET_LIST[p].emit("ownPosition", PLAYER_LIST[p].position);
        for(var a in PLAYER_LIST) {
            SOCKET_LIST[p].emit("playerCon", PLAYER_LIST[a].position);
        }
    }
}

function dealCards() {

    console.log("Deal Cards");
    var allInts = {};
    for(var i = 0;i<60;i++) {
        allInts[i] = i;
    }
    var shuffledCards = shuffleCards(allInts);

    var cardindex = 0;

    for(var p in PLAYER_LIST) {
        for(var i = 0;i<3;i++) {
            SOCKET_LIST[p].emit("newCard",shuffledCards[cardindex]);
            for (var a in PLAYER_LIST) {
                SOCKET_LIST[p].emit("cardBack",PLAYER_LIST[a].position);
            }
            cardindex++;
        }
    }

}

function shuffleCards(arr) {

    var j,x,i;
    for(i = 60 - 1; i>0;i--) {
        j = Math.floor(Math.random() * (i+1));
        x = arr[i];
        arr[i] = arr[j];
        arr[j] = x;
    }
    return arr;
}

function getNextFreePos() {
    for(var i = 0;i<index;i++) {
        console.log(POSITIONS[i]);
        if(POSITIONS[i] == null || POSITIONS[i] === undefined) {
            console.log("Returned: " + i);
            return i;
        }
    }
}

function startGame() {

    lobbyCount = playerCount;
    io.to("room").emit("redirectGame");
    isInGame = true;

}

