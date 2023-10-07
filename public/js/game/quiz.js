function GameWorld() {
  var states = {
    START: 0,
    TEST_QUESTION: 1,
    STARTING: 2,
    SHOW_QUESTION: 3,
    SHOW_ANSWER: 4,
    END: 5,
  };
  var socket = false;

  var userType = false;
  var selectedAnswerId = false;
  var curState = false;
  var savedState = false;

  this.init = function () {
    this.initSocket();
    this.initializeView();
    this.bindViewEvents();
    this.bindSocketEvents();

    socket.emit("quiz_init");
  };

  this.initSocket = function () {
    socket = io.connect({
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 1000,
      reconnectionAttempts: 1000,
    });
  };

  this.initializeView = function () {
    $("#timer_area").hide();
    $("#question_area").hide();
    $("#admin_area").hide();
  };

  this.showAreasBasedOnRoleAndState = function (state, stateParams) {
    $(".element").hide();

    /*All users, all states*/
    $("#controlpanel_area").show();
    $("#generic_options_area").show();

    if (
      state == null &&
      stateParams.leaderboard &&
      $("#btn_show_leaderboard").attr("show_leaderboard") == null
    ) {
      state = savedState;
    }

    /*All users, some states*/
    if (
      state == null &&
      stateParams.leaderboard &&
      $("#btn_show_leaderboard").attr("show_leaderboard")
    ) {
      $("#leaderboard_area").show();
      savedState = curState;
    } else if (
      state == states.TEST_QUESTION ||
      state == states.SHOW_QUESTION ||
      state == states.SHOW_ANSWER
    ) {
      $("#timer_area").show();
      $("#question_area").show();
    } else if (
      state == states.START ||
      state == states.STARTING ||
      state == states.END
    ) {
      $("#wait_area").show();
    }

    if (
      userType == "official_participant" ||
      userType == "unofficial_participant"
    ) {
      /*All states*/
      $("#participant_area").show();
    } else if (userType == "admin") {
      /*Before start*/
      if (state == states.SHOW_QUESTION) {
        $("#admin_area_after_start").show();
      } else if (
        state == states.START ||
        state == states.STARTING ||
        state == states.END ||
        state == states.TEST_QUESTION
      ) {
        $("#admin_area_before_start").show();
      } else if (state == states.SHOW_ANSWER) {
        $("#admin_area_show_answer").show();

        if (stateParams && stateParams.test)
          $("#admin_area_before_start").show();
        else $("#admin_area_after_start").show();
      }
    } else if (userType == "spectator") {
    }
  };

  this.bindViewEvents = function () {
    $("#btn_admin_test_question").click(function (e) {
      socket.emit("quiz_admin_test_question");
      return false;
    });

    $("#btn_admin_start_quiz").click(function (e) {
      socket.emit("quiz_admin_start_quiz");
      return false;
    });

    $("#btn_admin_next_question").click(function (e) {
      socket.emit("quiz_admin_next_question");
      return false;
    });

    $("#btn_admin_cancel_last_question").click(function (e) {
      if (confirm("Are you sure you want to cancel the last question?")) {
        if (confirm("Are you really sure?")) {
          socket.emit("quiz_admin_cancel_last_question");
        }
      }

      return false;
    });

    $("#btn_admin_end_quiz").click(function (e) {
      if (confirm("Are you sure you want to end the quiz?")) {
        if (confirm("Are you really sure?")) {
          socket.emit("quiz_admin_end_quiz");
        }
      }

      return false;
    });

    $("#btn_leave_quiz").click(function (e) {
      if (
        confirm(
          "Are you sure you want to leave the quiz? All your data will be lost. (score, etc.)"
        )
      ) {
        if (confirm("Are you really sure?")) {
          socket.emit("quiz_leave_quiz");
        }
      }

      return false;
    });

    $("#btn_show_leaderboard").click(
      (function (gameWorld) {
        return function (e) {
          var show = $("#btn_show_leaderboard").attr("show_leaderboard");

          if (show != null) {
            $("#leaderboard_area").hide();
            $("#btn_show_leaderboard").attr("show_leaderboard", null);
            $("#btn_show_leaderboard").html("Show Leaderboard");
          } else {
            socket.emit("quiz_get_leaderboard");
            $("#btn_show_leaderboard").attr("show_leaderboard", true);
            $("#btn_show_leaderboard").html("Hide Leaderboard");
          }

          gameWorld.showAreasBasedOnRoleAndState(null, { leaderboard: true });
        };
      })(this)
    );
  };

  this.bindSocketEvents = function () {
    socket.on(
      "quiz_init_ok",
      (function (gameWorld) {
        return function (data) {
          userType = data.userType;
          gameWorld.showAreasBasedOnRoleAndState(states.START, {});
        };
      })(this)
    );

    socket.on("quiz_init_nok", function (data) {
      location.href = "/";
    });

    socket.on(
      "quiz_state_update",
      (function (gameWorld) {
        return function (data) {
          var state = data.state;
          var stateParams = data.stateParams;

          //if receiving updates from the server, hide the leaderboard
          if ($("#btn_show_leaderboard").attr("show_leaderboard")) {
            $("#btn_show_leaderboard").trigger("click");
          }

          gameWorld.showAreasBasedOnRoleAndState(state, stateParams);
          curState = state;

          gameWorld.updateGeneralParams(stateParams);

          if (state == states.START) {
            gameWorld.start(stateParams);
          } else if (state == states.TEST_QUESTION) {
            gameWorld.showQuestion(stateParams);
          } else if (state == states.STARTING) {
            gameWorld.starting(stateParams);
          } else if (state == states.SHOW_QUESTION) {
            gameWorld.showQuestion(stateParams);
          } else if (state == states.SHOW_ANSWER) {
            gameWorld.showAnswer(stateParams);
          } else if (state == states.END) {
            gameWorld.end(stateParams);
          }
        };
      })(this)
    );

    socket.on("quiz_leaderboard", function (data) {
      var html = "";
      html += "<div>";

      // var types = ["official", "unofficial"];
      var types = ["official"];

      var names = {
        official: "Quiz Participants",
        // unofficial: "Audience Participants",
      };

      for (var t in types) {
        var participantsType = types[t];
        var name = names[participantsType];
        var elements = data[participantsType];

        html += "<h4>" + name + "</h4>";
        html += "<table class'custom-table'>";

        html += "<thead>";
        html += "<tr>";
        html +=
          "<th class='custom-header' >" +
          "Rank" +
          "</th>" +
          "<th class='custom-header' >" +
          "Name" +
          "</th>" +
          "<th class='custom-header' >" +
          "Score" +
          "</th>";
        html += "</tr>";
        html += "</thead>";

        html += "<tbody>";

        for (var elem in elements) {
          var p = elements[elem];

          var colorStyle = "";
          if (p.isLastCorrect === true) {
            colorStyle = "background-color:#a7f3d0";
          } else if (p.isLastCorrect === false) {
            colorStyle = "background-color: #f8fafc";
          }

          html += "<tr class='custom-gap-color' style='" + colorStyle + "'>";
          html +=
            "<td class='custom-cell'>" +
            p.rank +
            "</td>" +
            "<td class='custom-cell'>" +
            p.team +
            "</td>" +
            "<td class='custom-cell'>" +
            p.score +
            "</td>";
          html += "</tr>";
        }

        html += "</tbody>";

        html += "</table>";
      }

      console.log(html);

      $("#leaderboard_area").html(html);
    });
  };

  this.setWaitStatus = function (text) {
    $("#wait_status").html(text);
  };

  this.start = function (stateParams) {
    this.setWaitStatus("Get ready!");
  };

  this.starting = function (stateParams) {
    this.setWaitStatus("Starting... Good luck and have fun!");
  };

  this.showQuestion = function (stateParams) {
    $("#answer_status").html("");
    if (stateParams.pic != "")
      $("#question_area .pic").html(
        // "<img style='max-width: 500px; width:100%' src='" +
        //   stateParams.pic +
        //   "' />"
        "<img class='image__quiz' src='" + stateParams.pic + "' />"
      );
    else $("#question_area .pic").html("");

    $("#question_area .question").html(
      // stateParams.question + " (" + stateParams.marks + ")"
      stateParams.question
    );

    var answers = stateParams.answers;
    $("#question_area .answers").html("");

    selectedAnswerId = false;

    //abcd
    for (var i = 0; i < answers.length; i++) {
      var curLetter = String.fromCharCode(65 + i);
      var answerId = i + 1;

      var $div = $("<div class='answer__container'>", { answer_id: answerId })
        .addClass("answer_list")
        .addClass(`answer_${answerId}`)
        .append("<span/>")
        .text(`${curLetter}. ${answers[i]}`);

      // var $div = $("<div class='answer__container'>", { answer_id: answerId })
      //   .addClass("answer_list")
      //   .addClass(`answer_${answerId}`)
      //   .append(
      //     $("<span/>")
      //       .addClass(`curLetter_${curLetter} curLetter`)
      //       .text(`${curLetter}`)
      //   )
      //   .append($("<span/>").text(` ${answers[i]}`));

      $div.click(function () {
        if (
          (userType == "official_participant" ||
            userType == "unofficial_participant") &&
          (curState == states.SHOW_QUESTION || curState == states.TEST_QUESTION)
        ) {
          selectedAnswerId = $(this).attr("answer_id");
          socket.emit("quiz_send_answer", { answerId: selectedAnswerId });

          $("#question_area .answers div").css("background-color", "#f8fafc");
          $(this).css("background-color", "#eab308");
        }
      });

      $("#question_area .answers").append($div);
    }

    var d = new Date();
    d.setSeconds(d.getSeconds() + stateParams.time);

    $("#timer").countdown({
      until: d,
      format: "S",
      labels: ["", "", "", "", "", "", ""],
      labels1: ["", "", "", "", "", "", ""],
      onExpiry: function () {
        $(this).countdown("destroy");
      },
    });
  };

  this.showAnswer = function (stateParams) {
    this.setWaitStatus("Waiting for next question...");
    $("#timer").countdown("destroy");

    var correctAnswerId = stateParams.answerId;
    var isTest = stateParams.test;

    var correctAnswer = false;
    if (correctAnswerId == selectedAnswerId) {
      correctAnswer = true;
    }

    if (!correctAnswer && selectedAnswerId != false) {
      $("#question_area .answer_" + selectedAnswerId).css(
        "background-color",
        "#fb7185"
      );
    }

    // jawaban benar
    $("#question_area .answer_" + correctAnswerId).css({
      "background-color": "#99f6e4",
      color: "#fffff",
    });

    if (
      userType == "official_participant" ||
      userType == "unofficial_participant"
    ) {
      if (correctAnswer) {
        $("#answer_status").html(
          `<span class="correct_answer">Correct answer!</span>`
        );
      } else {
        $("#answer_status").html(
          `<span class="incorrect_answer">Incorrect answer!</span>`
        );
      }
    } else {
      $("#answer_status").html(`<span class="time__over">Time over!</span>`);
    }
  };

  this.end = function (stateParams) {
    this.setWaitStatus("Thanks for your participation!");
  };

  this.updateGeneralParams = function (stateParams) {
    if (stateParams && stateParams.rank) {
      var rank = stateParams.rank;
      `<div class="rank__status">Rank ${rank} </div>`;
    }
  };
}

$(document).ready(function () {
  var gameWorld = new GameWorld();
  gameWorld.init();
});
