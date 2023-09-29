function Index() {
  var socket = false;

  this.start = function () {
    socket = io();
    this.bindSocketEvents();
    socket.emit("index_init");
  };

  this.bindSocketEvents = function () {
    socket.on("index_init_ok", function (data) {
      var html = "";

      for (var i in data) {
        var q = data[i];

        html += `
			<div class="container__buttons" >
			<a href='${q.link}' id="btn_admin_connect" class="btn__default btn_fill">
			  Join Quiz
			</a>
		  </div>
			`;
      }

      $("#button__verifikasi").html(html);
    });
  };
}

$(document).ready(function () {
  var index = new Index();
  index.start();
});
