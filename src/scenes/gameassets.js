var click_aud;
var bg_machine_img = new Image(); bg_machine_img.src = "assets/wave-machine.png";
var toggle_up_img = new Image(); toggle_up_img.src = "assets/toggle-up-button.png";
var toggle_down_img = new Image(); toggle_down_img.src = "assets/toggle-down-button.png";
var slider_img = new Image(); slider_img.src = "assets/slider-button.png";
var knob_img = new Image(); knob_img.src = "assets/knob-button.png";
var lvl_button_img = new Image(); lvl_button_img.src = "assets/level-bg.png";
var fade_lvl_button_img = new Image(); fade_lvl_button_img.src = "assets/fade-level-bg.png";
var lvl_button_outline_img = new Image(); lvl_button_outline_img.src = "assets/level-bg-outline.png";
var lvl_lock_img = new Image(); lvl_lock_img.src = "assets/icon-locked.png";
var check_img = new Image(); check_img.src = "assets/icon-check.png";
var close_img = new Image(); close_img.src = "assets/icon-close.png";
var yard_logo_img = new Image(); yard_logo_img.src = "assets/theyard-logo.png";
var tall_img = new Image(); tall_img.src = "assets/scout.png";
var short_img = new Image(); short_img.src = "assets/honey.png";
var menu_img = new Image(); menu_img.src = "assets/icon-menu.png";
var next_img = new Image(); next_img.src = "assets/button-next.png";
var skip_img = new Image(); skip_img.src = "assets/button-skip.png";
var reroll_img = new Image(); reroll_img.src = "assets/button-reroll.png";
var next_button_img = new Image(); next_button_img.src = "assets/nextbtn-white.png";

var grad_img = GenIcon(10,100);
var grd=grad_img.context.createLinearGradient(0,0,0,grad_img.height);
grd.addColorStop(0,"rgba(99,228,248,0)");
grd.addColorStop(0.5,"rgba(99,228,248,1)");
grad_img.context.fillStyle = grd;
grad_img.context.fillRect(0,0,grad_img.width,grad_img.height);

