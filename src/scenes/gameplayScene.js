var default_completeness = false;
var print_debug = false;

var graph_n_samples = 500;
var graph_min_x = -50;
var graph_max_x =  50;
var graph_min_y = -50;
var graph_max_y =  50;
var graph_default_offset = (graph_min_x+graph_max_x)/2;
var graph_default_wavelength = (2+(graph_max_x*2))/2;
var graph_default_amplitude = graph_max_y/4;

var s_play_lvl = 0;
var s_levels_lvl = 0;
var s_levels_last_lvl = 0;
var s_random_lvl = 0;
var s_create_lvl = 0;

var dl_play_lvl = 0;
var dl_levels_lvl = 0;
var dl_levels_last_lvl = 0;
var dl_random_lvl = 0;
var dl_create_lvl = 0;

var ds_play_lvl = 0;
var ds_levels_lvl = 0;
var ds_levels_last_lvl = 0;
var ds_random_lvl = 0;
var ds_create_lvl = 0;

var d_play_lvl = 0;
var d_levels_lvl = 0;
var d_levels_last_lvl = 0;
var d_random_lvl = 0;
var d_create_lvl = 0;

var ENUM;

ENUM = 0;
var COMP_TYPE_NONE   = ENUM; ENUM++;
var COMP_TYPE_SIN    = ENUM; ENUM++;
var COMP_TYPE_SQUARE = ENUM; ENUM++;

ENUM = 0;
var GAME_MODE_LVL  = ENUM; ENUM++;
var GAME_MODE_PLAY = ENUM; ENUM++;
var game_mode = GAME_MODE_LVL;

var nullEditor; //HACK!

var Component = function(type, offset, wavelength, amplitude)
{
  var self = this;
  self.type = type;
  self.offset = offset;
  self.wavelength = wavelength;
  self.amplitude = amplitude;
  self.enabled = true;
  self.contribution = 1.0;

  self._dirty = true;

  self.set = function(type, offset, wavelength, amplitude)
  {
    self.type = type;
    self.offset     = nullEditor.pix2Off(Math.round(offset     * nullEditor.offset_slider.maxPixel()     ));
    self.wavelength = nullEditor.pix2Wav(Math.round(wavelength * nullEditor.wavelength_slider.maxPixel() ));
    self.amplitude  = nullEditor.pix2Amp(Math.round(amplitude  * nullEditor.amplitude_slider.maxPixel()  ));
    self.dirty();
  }

  self.f = function(x)
  {
    if(!self.enabled) return 0;

    x -= self.offset;
    var y = 0;

    switch(self.type)
    {
      case COMP_TYPE_NONE:
        break;
      case COMP_TYPE_SIN:
        x /= self.wavelength;
        y = Math.sin(x*(2*Math.PI));
        y *= self.amplitude;
        break;
      case COMP_TYPE_SQUARE:
        x /= self.wavelength;
        x *= 2;
        if(Math.floor(x)%2) y = -1;
        else                y = 1;
        y *= self.amplitude;
        break;
      default:
        break;
    }
    return y*self.contribution;
  }

  self.dirty   = function() { self._dirty = true; }
  self.cleanse = function()
  {
    self._dirty = false;
  }
  self.isDirty = function() { return self._dirty; }
}

var Composition = function(c0, c1)
{
  var self = this;
  self.c0 = c0;
  self.c1 = c1;

  self.f = function(x)
  {
    var y = 0;
    y += self.c0.f(x);
    y += self.c1.f(x);
    return y;
  }

  self.dirty = function()
  {
    self.c0.dirty();
    self.c1.dirty();
  }
  self.cleanse = function()
  {
    self.c0.cleanse();
    self.c1.cleanse();
  }
  self.isDirty = function()
  {
    return self.c0.isDirty() || self.c1.isDirty();
  }
}

var GraphDrawer = function(composition, n_samples, min_x, max_x, min_y, max_y, x, y, w, h)
{
  var self = this;
  self.composition = composition;
  self.n_samples = n_samples; if(self.n_samples < 2) self.n_samples = 2; //left and right side of graph at minimum

  self.x = x;
  self.y = y;
  self.w = w;
  self.h = h;

  self.min_x = min_x;
  self.max_x = max_x;
  self.min_y = min_y;
  self.max_y = max_y;

  self.draw_zero_x = false;
  self.draw_zero_x_at_composition = true;
  self.draw_zero_x_at_offset = 0;
  self.draw_zero_y = false;

  self.canv = new Canv(
    {
      width:self.w,
      height:self.h,
      fillStyle:"#000000",
      strokeStyle:"#000000",
      smoothing:true
    }
  );

  self.color = "#000000";
  self.lineWidth = 2;
  self._dirty = true;

  self.draw = function(canv)
  {
    if(self.isDirty())
    {
      self.canv.clear();

      var sample;
      var t;

      if(self.draw_zero_y)
      {
        self.canv.context.strokeStyle = "#555555";
        self.canv.context.lineWidth = 0.5;
        self.canv.context.beginPath();
        self.canv.context.moveTo(0,self.h/2+0.5);
        self.canv.context.lineTo(self.w,self.h/2+0.5);
        self.canv.context.stroke();
      }
      if(self.draw_zero_x)
      {
        self.canv.context.strokeStyle = "#555555";
        self.canv.context.lineWidth = 0.5;
        self.canv.context.beginPath();
        var x;
        if(self.draw_zero_x_at_composition)
          x = mapRange(self.max_x,self.min_x,self.composition.offset,self.w,0)
        else
          x = mapRange(self.max_x,self.min_x,self.draw_zero_x_at_offset,self.w,0)
        self.canv.context.moveTo(x+0.5,0);
        self.canv.context.lineTo(x+0.5,self.h);
        self.canv.context.stroke();
      }

      self.canv.context.strokeStyle = self.color;
      self.canv.context.lineWidth = self.lineWidth;
      self.canv.context.beginPath();
      sample = self.composition.f(self.min_x);
      self.canv.context.moveTo(0,mapRange(self.min_y,self.max_y,sample,self.h,0));
      for(var i = 1; i < self.n_samples; i++)
      {
        t = i/(self.n_samples-1);
        sample = self.composition.f(lerp(self.min_x,self.max_x,t));
        self.canv.context.lineTo(t*self.w,mapRange(self.min_y,self.max_y,sample,self.h,0));
      }
      self.canv.context.stroke();
    }

    canv.context.drawImage(self.canv.canvas, 0, 0, self.w, self.h, self.x, self.y, self.w, self.h);
    canv.context.lineWidth = 1;
    canv.context.strokeStyle = "#000000";
    canv.context.strokeRect(self.x+0.5,self.y+0.5,self.w,self.h);
  }

  self.dirty = function()
  {
    self._dirty = true;
  }
  self.cleanse = function()
  {
    self._dirty = false;
  }
  self.isDirty = function()
  {
    return self._dirty || self.composition.isDirty();
  }
}

var CompositionAnimationDrawer = function(component_a, component_b, n_samples, min_x, max_x, min_y, max_y, x, y, w, h)
{
  var self = this;
  self.component_a = component_a;
  self.component_b = component_b;
  self.n_samples = n_samples; if(self.n_samples < 2) self.n_samples = 2; //left and right side of graph at minimum

  self.x = x;
  self.y = y;
  self.w = w;
  self.h = h;

  self.min_x = min_x;
  self.max_x = max_x;
  self.min_y = min_y;
  self.max_y = max_y;

  self.canv; //gets initialized in position

  self.lineWidth = 2;
  self._dirty = true;
  self.frames_per_sample = 40;

  self.position = function(x,y,w,h)
  {
    self.x = x;
    self.y = y;
    self.w = w;
    self.h = h;

    self.canv = new Canv(
      {
        width:self.w,
        height:self.h,
        fillStyle:"#000000",
        strokeStyle:"#000000",
        smoothing:true
      }
    );
    self._dirty = true;
  }
  self.position(self.x,self.y,self.w,self.h);

  self.draw = function(canv)
  {
    if(self.isDirty())
    {
      self.canv.clear();

      var sample;
      var t;
      var x;
      var y_a;
      var y_b;
      var h;
      var allowed_dist;

      for(var i = 0; i < self.progress && i < self.n_samples*2; i++)
      {
        if(i < self.n_samples) t = i/(self.n_samples-1);
        else t = (i-self.n_samples)/(self.n_samples-1);
        x = t*self.w;

        sample = self.component_a.f(lerp(self.min_x,self.max_x,t));
        y_a = mapRange(self.min_y,self.max_y,sample,self.h,0);
        if(i < self.n_samples)
        {
          h = y_a-self.h/2;
          allowed_dist = Math.abs((self.progress-i)/self.frames_per_sample);
          allowed_dist *= self.h/2;
          if(self.progress < (i+self.frames_per_sample) && Math.abs(h) > allowed_dist)
          {
            if(h < 0) h = -allowed_dist;
            else      h = allowed_dist;
          }

          self.canv.context.fillStyle = "#FF0000";
          self.canv.context.fillRect(x-1,self.h/2,1,h);
        }

        if(i > self.n_samples)
        {
          sample = self.component_b.f(lerp(self.min_x,self.max_x,t));
          y_b = mapRange(self.min_y,self.max_y,sample,self.h,0);

          h = y_b-self.h/2;
          allowed_dist = Math.abs((self.progress-i)/self.frames_per_sample);
          allowed_dist *= self.h/2;
          if(self.progress < (i+self.frames_per_sample) && Math.abs(h) > allowed_dist)
          {
            if(h < 0) h = -allowed_dist;
            else      h = allowed_dist;
          }

          self.canv.context.fillStyle = "#0000FF";
          self.canv.context.fillRect(x+1,self.h/2+(y_a-self.h/2),1,h);
        }
      }

      self._dirty = false;
    }

    canv.context.drawImage(self.canv.canvas, 0, 0, self.w, self.h, self.x, self.y, self.w, self.h);
  }

  self.progress = 0;
  self.intended_progress = 0;
  self.tick = function()
  {
    if(self.progress < self.intended_progress) { self.progress++; self.dirty(); }
    if(self.progress > self.intended_progress) { self.progress--; self.dirty(); }
  }

  self.animateForward = function()
  {
    self.intended_progress = (self.n_samples*2)+self.frames_per_sample;
  }
  self.animateBackward = function(head_start)
  {
    if(head_start && self.progress > self.n_samples) self.progress = self.n_samples+self.frames_per_sample;
    self.intended_progress = 0;
  }

  self.dirty = function()
  {
    self._dirty = true;
  }
  self.cleanse = function()
  {
    self._dirty = false;
  }
  self.isDirty = function()
  {
    return self._dirty || self.component_a.isDirty() || self.component_b.isDirty();
  }
}

var ComponentEditor = function(component, n_samples, min_x, max_x, min_y, max_y, color, x,y,w,h)
{
  var self = this;
  self.component = component;
  self.n_samples = n_samples; if(self.n_samples < 2) self.n_samples = 2; //left and right side of graph at minimum

  self.min_x = min_x;
  self.max_x = max_x;
  self.min_y = min_y;
  self.max_y = max_y;

  self.color = color;

  self.x = x;
  self.y = y;
  self.w = w;
  self.h = h;

  self.default_offset = (self.min_x+self.max_x)/2;
  self.default_wavelength = self.max_x;
  self.default_amplitude = self.max_y/4;

  self.graph = new GraphDrawer(self.component, self.n_samples, self.min_x, self.max_x, self.min_y, self.max_y, self.x+10, self.y+10, self.w-20, (self.h-20)/2);
  self.graph.color = self.color;
  self.graph.draw_zero_x = true;
  self.graph.draw_zero_y = true;
  self.reset_button  = new ButtonBox(self.x+self.w-10-30, self.y+(self.h/2)+10, 30, 30, function(on) { if(!self.enabled || !self.component.enabled) return; self.reset(); });
  self.toggle_button = new ToggleBox(self.x+self.w-10-30, self.y+self.h-10-30, 30, 30, true, function(on) { if(!self.toggle_enabled) return; if(on) self.goal_contribution = 1; else self.goal_contribution = 0; });
  self.goal_contribution = 1;

  self.offset_slider     = new SmoothSliderBox(    self.x+10+30, self.y+self.h/2+10,          self.w-10-self.reset_button.w-10-20-10-10-30, 20, self.min_x,       self.max_x,     self.default_offset, function(n) { if(!self.enabled || !self.component.enabled) { self.offset_slider.val     = self.component.offset;     self.offset_slider.desired_val     = self.component.offset;     } else { self.component.offset     = n; self.component.dirty(); } });
  self.wavelength_slider = new SmoothSliderSqrtBox(self.x+10+30, self.y+self.h/2+self.h/4-10, self.w-10-self.reset_button.w-10-20-10-10-30, 20,          2,     self.max_x*2, self.default_wavelength, function(n) { if(!self.enabled || !self.component.enabled) { self.wavelength_slider.val = self.component.wavelength; self.wavelength_slider.desired_val = self.component.wavelength; } else { self.component.wavelength = n; self.component.dirty(); } });
  self.amplitude_slider  = new SmoothSliderBox(    self.x+10+30, self.y+self.h-10-20,         self.w-10-self.reset_button.w-10-20-10-10-30, 20,          0, self.max_y*(3/5),  self.default_amplitude, function(n) { if(!self.enabled || !self.component.enabled) { self.amplitude_slider.val  = self.component.amplitude;  self.amplitude_slider.desired_val  = self.component.amplitude;  } else { self.component.amplitude  = n; self.component.dirty(); } });

  self.offset_dec_button = new ButtonBox(self.x+10, self.offset_slider.y, 20, 20, function(on) { if(!self.enabled || !self.component.enabled) return; self.offset_slider.desired_val = self.offset_slider.valAtPixel(Math.round(self.offset_slider.pixelAtVal(self.offset_slider.val))-1); });
  self.offset_inc_button = new ButtonBox(self.x+self.w-10-self.reset_button.w-10-20, self.offset_slider.y, 20, 20, function(on) { if(!self.enabled || !self.component.enabled) return; self.offset_slider.desired_val = self.offset_slider.valAtPixel(Math.round(self.offset_slider.pixelAtVal(self.offset_slider.val))+1); });
  self.wavelength_dec_button = new ButtonBox(self.x+10, self.wavelength_slider.y, 20, 20, function(on) { if(!self.enabled || !self.component.enabled) return; self.wavelength_slider.desired_val = self.wavelength_slider.valAtPixel(Math.round(self.wavelength_slider.pixelAtVal(self.wavelength_slider.val))-1); });
  self.wavelength_inc_button = new ButtonBox(self.x+self.w-10-self.reset_button.w-10-20, self.wavelength_slider.y, 20, 20, function(on) { if(!self.enabled || !self.component.enabled) return; self.wavelength_slider.desired_val = self.wavelength_slider.valAtPixel(Math.round(self.wavelength_slider.pixelAtVal(self.wavelength_slider.val))+1); });
  self.amplitude_dec_button = new ButtonBox(self.x+10, self.amplitude_slider.y, 20, 20, function(on) { if(!self.enabled || !self.component.enabled) return; self.amplitude_slider.desired_val = self.amplitude_slider.valAtPixel(Math.round(self.amplitude_slider.pixelAtVal(self.amplitude_slider.val))-1); });
  self.amplitude_inc_button = new ButtonBox(self.x+self.w-10-self.reset_button.w-10-20, self.amplitude_slider.y, 20, 20, function(on) { if(!self.enabled || !self.component.enabled) return; self.amplitude_slider.desired_val = self.amplitude_slider.valAtPixel(Math.round(self.amplitude_slider.pixelAtVal(self.amplitude_slider.val))+1); });

  self.enabled = true;
  self.visible = true;
  self.toggle_enabled = true;
  self.toggle_default = true;

  self.isDragging = function()
  {
    return self.offset_slider.dragging || self.wavelength_slider.dragging || self.amplitude_slider.dragging;
  }

  self.register = function(dragger, presser, clicker)
  {
    dragger.register(self.offset_slider);
    dragger.register(self.wavelength_slider);
    dragger.register(self.amplitude_slider);

    presser.register(self.reset_button);
    clicker.register(self.reset_button);

    presser.register(self.toggle_button);
    clicker.register(self.toggle_button);

    presser.register(self.offset_dec_button);
    clicker.register(self.offset_dec_button);
    presser.register(self.offset_inc_button);
    clicker.register(self.offset_inc_button);
    presser.register(self.wavelength_dec_button);
    clicker.register(self.wavelength_dec_button);
    presser.register(self.wavelength_inc_button);
    clicker.register(self.wavelength_inc_button);
    presser.register(self.amplitude_dec_button);
    clicker.register(self.amplitude_dec_button);
    presser.register(self.amplitude_inc_button);
    clicker.register(self.amplitude_inc_button);

  }

  self.setDefaults = function(offset, wavelength, amplitude)
  {
    self.default_offset     = self.pix2Off(Math.round(offset     * self.offset_slider.maxPixel()     ));
    self.default_wavelength = self.pix2Wav(Math.round(wavelength * self.wavelength_slider.maxPixel() ));
    self.default_amplitude  = self.pix2Amp(Math.round(amplitude  * self.amplitude_slider.maxPixel()  ));
  }

  self.hardReset = function()
  {
    self.goal_contribution = 1;
    self.offset_slider.val = self.default_offset;
    self.wavelength_slider.val = self.default_wavelength;
    self.amplitude_slider.val = self.default_amplitude;
    self.offset_slider.desired_val = self.default_offset;
    self.wavelength_slider.desired_val = self.default_wavelength;
    self.amplitude_slider.desired_val = self.default_amplitude;
    self.component.offset = self.default_offset;
    self.component.wavelength = self.default_wavelength;
    self.component.amplitude = self.default_amplitude;
    self.component.dirty();
  }

  self.reset = function()
  {
    self.offset_slider.set(self.default_offset);
    self.wavelength_slider.set(self.default_wavelength);
    self.amplitude_slider.set(self.default_amplitude);
  }

  //In creating levels, the goal inputs must be aligned to the integer pixels allowed by the UI (to prevent un-winnable levels)
  //Use these to assign valid values to components
  self.pix2Off = function(p) { return self.offset_slider.valAtPixel(p); }
  self.pix2Wav = function(p) { return self.wavelength_slider.valAtPixel(p); }
  self.pix2Amp = function(p) { return self.amplitude_slider.valAtPixel(p); }

  self.tick = function()
  {
    self.offset_slider.tick();
    self.wavelength_slider.tick();
    self.amplitude_slider.tick();

    var old_contribution = self.component.contribution;
    /*
    if(Math.abs(self.component.contribution-self.goal_contribution) > 0.0751)
    {
      if(self.component.contribution < self.goal_contribution)
        self.component.contribution += 0.075;
      if(self.component.contribution > self.goal_contribution)
        self.component.contribution -= 0.075;
    }
    */
    if(Math.abs(self.component.contribution-self.goal_contribution) > 0.001)
      self.component.contribution = lerp(self.component.contribution, self.goal_contribution, 0.2);
    else
    {
      self.component.contribution = self.goal_contribution;
    }
    if(old_contribution != self.component.contribution)
      self.component.dirty();
  }

  self.draw = function(canv)
  {
    if(!self.visible) return;

    self.graph.draw(canv);

    self.reset_button.draw(canv);
    if(self.toggle_enabled)
      self.toggle_button.draw(canv);

    self.offset_dec_button.draw(canv);
    self.offset_inc_button.draw(canv);
    self.wavelength_dec_button.draw(canv);
    self.wavelength_inc_button.draw(canv);
    self.amplitude_dec_button.draw(canv);
    self.amplitude_inc_button.draw(canv);

    canv.context.lineWidth = 1;
    canv.context.strokeStyle = "#000000";
    self.offset_slider.draw(canv);
    self.wavelength_slider.draw(canv);
    self.amplitude_slider.draw(canv);
    canv.context.strokeRect(self.x+0.5,self.y+0.5,self.w,self.h);

    if(!self.enabled)
    {
      canv.context.fillStyle = "rgba(100,100,100,0.5)";
      canv.context.fillRect(self.x,self.y,self.w,self.h);
    }
  }
}

var Validator = function(myC, gC, min_x, max_x, res)
{
  var self = this;

  self.myC = myC;
  self.gC  = gC;

  self.min_x = min_x;
  self.max_x = max_x;

  self.res = res;

  self._dirty = true;

  self.valid = false;
  self.delta = 999999;

  self.validate = function(wiggle_room)
  {
    if(!self.isDirty() && !self.myC.isDirty() && !self.gC.isDirty()) return self.valid; //last known result

    self.delta = 0;
    var t;
    var s0;
    var s1;
    for(var i = 0; i < res; i++)
    {
      t = i/(self.res-1);
      s0 = self.myC.f(lerp(self.min_x,self.max_x,t));
      s1 = self.gC.f( lerp(self.min_x,self.max_x,t));
      self.delta += Math.abs(s0-s1);
    }
    //console.log(self.delta);
    self.valid = self.delta < wiggle_room;
    return self.valid;
  }

  self.dirty   = function() { self._dirty = true; };
  self.cleanse = function() { self._dirty = false; };
  self.isDirty = function() { return self._dirty; };
}

var ValidatorDrawer = function(x, y, w, h, validator)
{
  var self = this;

  self.x = x;
  self.y = y;
  self.w = w;
  self.h = h;

  self.draw = function(wiggle_room, canv)
  {
    canv.context.fillStyle = "#000000";
    var len = self.w-(self.w*(validator.delta-wiggle_room)/9999);
    if(len < 0) len = 0;
    if(len > self.w) len = self.w;
    canv.context.fillRect(self.x,self.y,len,self.h);
  }
}

var Level = function()
{
  var self = this;

  self.myC0_type = COMP_TYPE_NONE;
  self.myC0_offset = graph_default_offset;
  self.myC0_wavelength = graph_default_wavelength;
  self.myC0_amplitude = graph_default_amplitude;

  self.myC1_type = COMP_TYPE_NONE;
  self.myC1_offset = graph_default_offset;
  self.myC1_wavelength = graph_default_wavelength;
  self.myC1_amplitude = graph_default_amplitude;

  self.gC0_type = COMP_TYPE_NONE;
  self.gC0_offset = graph_default_offset;
  self.gC0_wavelength = graph_default_wavelength;
  self.gC0_amplitude = graph_default_amplitude;

  self.gC1_type = COMP_TYPE_NONE;
  self.gC1_offset = graph_default_offset;
  self.gC1_wavelength = graph_default_wavelength;
  self.gC1_amplitude = graph_default_amplitude;

  self.myE0_enabled = true;
  self.myE0_visible = true;
  self.myE0_toggle_enabled = true;
  self.myE0_toggle_default = true;
  self.myE1_enabled = true;
  self.myE1_visible = true;
  self.myE1_toggle_enabled = true;
  self.myE1_toggle_default = true;

  self.allowed_wiggle_room = 0; //make sure you change this- will never be perfect
  self.playground = false;
}

var ClipBoard = function(x,y,w,h,scene,levels)
{
  var self = this;

  self.canv;

  self.x = x;
  self.y = y;
  self.w = w;
  self.h = h;
  self.desired_y = y;

  self.canv = new Canv(
    {
      width:self.w,
      height:self.h,
      fillStyle:"#000000",
      strokeStyle:"#000000",
      smoothing:true
    }
  );

  self._dirty = true;

  self.buttons = [];
  self.dismiss_button = new ButtonBox(self.w-20-20,20,20,20, function(on) { if(!levels[self.s_levels.req_lvl].complete) scene.requestLevel(s_play_lvl); scene.setMode(GAME_MODE_PLAY); }); self.buttons.push(self.dismiss_button);
  self.dismiss_button.draw = function(canv)
  {
    if(this.down) canv.context.strokeStyle = "#00F400";
    else          canv.context.strokeStyle = "#000000";

    canv.context.fillStyle = "#00F400";

    canv.context.fillRect(this.off_x,this.off_y,this.w,this.h);
    canv.context.strokeRect(this.off_x+0.5,this.off_y+0.5,this.w,this.h);
  }

  var bs = 80;
  //sections: s (single), dl (double locked), ds (double single), d (double)
  self.s_play   = new ButtonBox(20+((bs+10)*0),20+((bs+10)*0),bs,bs, function(on) { /* the one level that's always unlocked */ scene.requestLevel(s_play_lvl); });  self.s_play.req_lvl   = -1;                self.buttons.push(self.s_play);
  self.s_levels = new ButtonBox(20+((bs+10)*1),20+((bs+10)*0),bs,bs, function(on) { if(levels[self.s_levels.req_lvl].complete) scene.requestLevel(s_levels_lvl);}); self.s_levels.req_lvl = s_play_lvl;        self.buttons.push(self.s_levels);
  //self.s_random = new ButtonBox(20+((bs+10)*2),20+((bs+10)*0),bs,bs, function(on) { if(levels[self.s_random.req_lvl].complete) scene.requestLevel(s_random_lvl);}); self.s_random.req_lvl = s_levels_last_lvl; self.buttons.push(self.s_random);
  //self.s_create = new ButtonBox(20+((bs+10)*3),20+((bs+10)*0),bs,bs, function(on) { if(levels[self.s_create.req_lvl].complete) scene.requestLevel(s_create_lvl);}); self.s_create.req_lvl = s_levels_last_lvl; self.buttons.push(self.s_create);

  self.d_play    = new ButtonBox(20+((bs+10)*0),20+((bs+10)*1),bs,bs*3+20, function(on) { if(levels[self.d_play.req_lvl].complete)    scene.requestLevel(d_play_lvl);});    self.d_play.req_lvl    = s_levels_last_lvl;  self.buttons.push(self.d_play);
  self.dl_levels = new ButtonBox(20+((bs+10)*1),20+((bs+10)*1),bs,bs,      function(on) { if(levels[self.dl_levels.req_lvl].complete) scene.requestLevel(dl_levels_lvl);}); self.dl_levels.req_lvl = dl_play_lvl;        self.buttons.push(self.dl_levels);
  //self.dl_random = new ButtonBox(20+((bs+10)*2),20+((bs+10)*1),bs,bs,      function(on) { if(levels[self.dl_random.req_lvl].complete) scene.requestLevel(dl_random_lvl);}); self.dl_random.req_lvl = dl_levels_last_lvl; self.buttons.push(self.dl_random);
  //self.dl_create = new ButtonBox(20+((bs+10)*3),20+((bs+10)*1),bs,bs,      function(on) { if(levels[self.dl_create.req_lvl].complete) scene.requestLevel(dl_create_lvl);}); self.dl_create.req_lvl = dl_levels_last_lvl; self.buttons.push(self.dl_create);

  self.ds_levels = new ButtonBox(20+((bs+10)*1),20+((bs+10)*2),bs,bs,     function(on) { if(levels[self.ds_levels.req_lvl].complete) scene.requestLevel(ds_levels_lvl);}); self.ds_levels.req_lvl = dl_levels_last_lvl; self.buttons.push(self.ds_levels);
  //self.d_random = new ButtonBox(20+((bs+10)*2),20+((bs+10)*2),bs,bs*2+10, function(on) { if(levels[self.d_random.req_lvl].complete) scene.requestLevel(d_random_lvl);}); self.d_random.req_lvl = ds_levels_last_lvl; self.buttons.push(self.d_random);
  //self.d_create = new ButtonBox(20+((bs+10)*3),20+((bs+10)*2),bs,bs*2+10, function(on) { if(levels[self.d_create.req_lvl].complete) scene.requestLevel(d_create_lvl);}); self.d_create.req_lvl = ds_levels_last_lvl; self.buttons.push(self.d_create);

  self.d_levels = new ButtonBox(20+((bs+10)*1),20+((bs+10)*3),bs,bs, function(on) { if(levels[self.d_levels.req_lvl].complete) scene.requestLevel(d_levels_lvl);}); self.d_levels.req_lvl = ds_levels_last_lvl;         self.buttons.push(self.d_levels);

  //quick hack to fix clicker even though on separate canv
  var draw = function(canv)
  {
    if(this.down) canv.context.strokeStyle = "#00F400";
    else          canv.context.strokeStyle = "#000000";

    if(this.req_lvl < 0 || levels[this.req_lvl].complete)
      canv.context.fillStyle = "#00F400";
    else
      canv.context.fillStyle = "#FF8800";

    canv.context.fillRect(this.off_x,this.off_y,this.w,this.h);
    canv.context.strokeRect(this.off_x+0.5,this.off_y+0.5,this.w,this.h);
  }
  for(var i = 0; i < self.buttons.length; i++)
  {
    var b = self.buttons[i];

    b.off_x = b.x;
    b.off_y = b.y;
    b.x = b.off_x+self.x;
    b.y = b.off_y+self.y;

    if(i != 0) //for dismiss button, I know, hack
      b.draw = draw;
  }

  self.draw = function(canv)
  {
    if(self.isDirty())
    {
      self.canv.clear();

      self.canv.context.fillStyle = "#000000";
      self.canv.context.fillRect(0,0,self.w,self.h);
      self.canv.context.fillStyle = "#FFFFFF";
      self.canv.context.fillRect(10,10,self.w-20,self.h-10);

      self.canv.strokeStyle = "#000000";

      for(var i = 0; i < self.buttons.length; i++)
        self.buttons[i].draw(self.canv);
    }

    if(self.y < canv.canvas.height) //if on screen
      canv.context.drawImage(self.canv.canvas, 0, 0, self.w, self.h, self.x, self.y, self.w, self.h);
  }

  self.tick = function()
  {
    if(self.desired_y != self.y)
    {
      if(Math.abs(self.desired_y-self.y) < 1) self.y = self.desired_y;
      else self.y = lerp(self.y, self.desired_y, 0.2);

      for(var i = 0; i < self.buttons.length; i++)
      {
        var b = self.buttons[i];
        b.x = b.off_x+self.x;
        b.y = b.off_y+self.y;
      }
    }
  }

  self.register = function(clicker)
  {
    for(var i = 0; i < self.buttons.length; i++)
      clicker.register(self.buttons[i]);
  }

  self.dirty   = function() { self._dirty = true; }
  self.cleanse = function()
  {
    self._dirty = false;
  }
  self.isDirty = function() { return self._dirty; }
}

var GamePlayScene = function(game, stage)
{
  var self = this;
  self.dc = stage.drawCanv;
  self.c = self.dc.canvas;

  var lvl_clicker;
  var play_dragger;
  var play_presser;
  var play_clicker;

  var clip;

  var nullC;
  var myC0;
  var myC1;
  var myComp;
  var myDisplay;
  var myE0;
  var myE1;

  var e0AnimDisplay;
  var e1AnimDisplay;
  var myAnimDisplay;

  var gC0;
  var gC1;
  var gComp;
  var gDisplay;

  var menuButton;
  var readyButton;
  var composeButton;

  var skipButton;
  var printButton;

  var validator;
  var vDrawer;

  var cur_level;
  var n_levels;
  var levels;

  self.ready = function()
  {
    var level;
    cur_level = 0;
    n_levels = 0;
    levels = [];

    nullC = new Component(COMP_TYPE_NONE, 0, 0, 0);
    myC0 = new Component(COMP_TYPE_SIN, graph_default_offset, graph_default_wavelength, graph_default_amplitude);
    myC1 = new Component(COMP_TYPE_NONE, graph_default_offset, graph_default_wavelength, graph_default_amplitude);
    myComp = new Composition(myC0, myC1);
    myDisplay = new GraphDrawer(myComp,   graph_n_samples, graph_min_x, graph_max_x, graph_min_y, graph_max_y,                     10,                 10,        self.c.width-20, ((self.c.height-20)/2));
    myDisplay.color = "#FF00FF";
    myDisplay.draw_zero_x = false;
    myDisplay.draw_zero_x_at_composition = false;
    myDisplay.draw_zero_y = true;
    nullEditor = new ComponentEditor(myC0, graph_n_samples, graph_min_x, graph_max_x, graph_min_y, graph_max_y, "#FF0000",                     10, self.c.height/2+10, (self.c.width/2)-20-20,   (self.c.height/2)-20);
    myE0 = new ComponentEditor(myC0, graph_n_samples, graph_min_x, graph_max_x, graph_min_y, graph_max_y, "#FF0000",                     10, self.c.height/2+10, (self.c.width/2)-20-20,   (self.c.height/2)-20);
    myE1 = new ComponentEditor(myC1, graph_n_samples, graph_min_x, graph_max_x, graph_min_y, graph_max_y, "#0000FF", (self.c.width/2)+10+20, self.c.height/2+10, (self.c.width/2)-20-20,   (self.c.height/2)-20);

    s_play_lvl = n_levels;
    //lvl0 //single-wave playground
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_NONE;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 0.5;
    level.myC0_wavelength = 0.5;       level.myC1_wavelength = 0.5;
    level.myC0_amplitude  = 0.5;       level.myC1_amplitude  = 0.5;
    level.myE0_random = false;         level.myE1_random = false;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = false;
    level.myE0_toggle_enabled = false; level.myE1_toggle_enabled = false;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = false;
    level.gC0_type = COMP_TYPE_NONE;   level.gC1_type = COMP_TYPE_NONE;
    level.gC0_offset      = 0.5;       level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 0.5;       level.gC1_wavelength  = 0.5;
    level.gC0_amplitude   = 0.5;       level.gC1_amplitude   = 0.5;
    level.gC0_random = false;          level.gC1_random = false;
    level.allowed_wiggle_room = 500;
    level.playground = true;
    level.return_to_menu = true;
    level.complete = default_completeness;
    levels.push(level);

    s_levels_lvl = n_levels;
    //lvl1 //learn offset
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_NONE;
    level.myC0_offset     = 0.458;       level.myC1_offset     = 0.5;
    level.myC0_wavelength = 0.5;       level.myC1_wavelength = 0.5;
    level.myC0_amplitude  = 0.5;       level.myC1_amplitude  = 0.5;
    level.myE0_random = false;         level.myE1_random = false;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = false;
    level.myE0_toggle_enabled = false; level.myE1_toggle_enabled = false;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = false;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_NONE;
    level.gC0_offset      = 0.6;       level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 0.5;       level.gC1_wavelength  = 0.5;
    level.gC0_amplitude   = 0.5;       level.gC1_amplitude   = 0.5;
    level.gC0_random = false;          level.gC1_random = false;
    level.allowed_wiggle_room = 500;
    level.playground = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    levels.push(level);

    //lvl2 //learn wavelength
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_NONE;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 0.5;
    level.myC0_wavelength = 0.5;       level.myC1_wavelength = 0.5;
    level.myC0_amplitude  = 0.5;       level.myC1_amplitude  = 0.5;
    level.myE0_random = false;         level.myE1_random = false;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = false;
    level.myE0_toggle_enabled = false; level.myE1_toggle_enabled = false;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = false;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_NONE;
    level.gC0_offset      = 0.5;       level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 0.3;       level.gC1_wavelength  = 0.5;
    level.gC0_amplitude   = 0.5;       level.gC1_amplitude   = 0.5;
    level.gC0_random = false;          level.gC1_random = false;
    level.allowed_wiggle_room = 910;
    level.playground = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    levels.push(level);

    //lvl3 //learn amplitude (plus a bit of offset)
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_NONE;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 0.5;
    level.myC0_wavelength = 0.5;       level.myC1_wavelength = 0.5;
    level.myC0_amplitude  = 0.5;       level.myC1_amplitude  = 0.5;
    level.myE0_random = false;         level.myE1_random = false;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = false;
    level.myE0_toggle_enabled = false; level.myE1_toggle_enabled = false;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = false;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_NONE;
    level.gC0_offset      = 0.55;      level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 0.5;       level.gC1_wavelength  = 0.5;
    level.gC0_amplitude   = 1.0;       level.gC1_amplitude   = 0.5;
    level.gC0_random = false;          level.gC1_random = false;
    level.allowed_wiggle_room = 1000;
    level.playground = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    levels.push(level);

    //lvl4 //try all three
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_NONE;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 0.5;
    level.myC0_wavelength = 0.5;       level.myC1_wavelength = 0.5;
    level.myC0_amplitude  = 0.5;       level.myC1_amplitude  = 0.5;
    level.myE0_random = false;         level.myE1_random = false;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = false;
    level.myE0_toggle_enabled = false; level.myE1_toggle_enabled = false;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = false;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_NONE;
    level.gC0_offset      = 0.45;      level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 0.4;       level.gC1_wavelength  = 0.5;
    level.gC0_amplitude   = 0.8;       level.gC1_amplitude   = 0.5;
    level.gC0_random = false;          level.gC1_random = false;
    level.allowed_wiggle_room = 900;
    level.playground = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    levels.push(level);

    //lvl5 //all three (low amp wave looks different)
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_NONE;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 0.5;
    level.myC0_wavelength = 0.5;       level.myC1_wavelength = 0.5;
    level.myC0_amplitude  = 0.5;       level.myC1_amplitude  = 0.5;
    level.myE0_random = false;         level.myE1_random = false;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = false;
    level.myE0_toggle_enabled = false; level.myE1_toggle_enabled = false;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = false;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_NONE;
    level.gC0_offset      = 0.9;       level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 0.7;       level.gC1_wavelength  = 0.5;
    level.gC0_amplitude   = 0.2;       level.gC1_amplitude   = 0.5;
    level.gC0_random = false;          level.gC1_random = false;
    level.allowed_wiggle_room = 300;
    level.playground = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    levels.push(level);

    s_levels_last_lvl = n_levels;
    //lvl6 //zero amp wave
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_NONE;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 0.5;
    level.myC0_wavelength = 0.5;       level.myC1_wavelength = 0.5;
    level.myC0_amplitude  = 0.0;       level.myC1_amplitude  = 0.5;
    level.myE0_random = false;         level.myE1_random = false;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = false;
    level.myE0_toggle_enabled = false; level.myE1_toggle_enabled = false;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = false;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_NONE;
    level.gC0_offset      = 0.3;       level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 0.5;       level.gC1_wavelength  = 0.5;
    level.gC0_amplitude   = 0.5;       level.gC1_amplitude   = 0.5;
    level.gC0_random = false;          level.gC1_random = false;
    level.allowed_wiggle_room = 500;
    level.playground = false;
    level.return_to_menu = true;
    level.complete = default_completeness;
    levels.push(level);

    s_random_lvl = n_levels;
    //lvl7 //single wave random
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_NONE;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 0.5;
    level.myC0_wavelength = 0.5;       level.myC1_wavelength = 0.5;
    level.myC0_amplitude  = 0.5;       level.myC1_amplitude  = 0.5;
    level.myE0_random = true;          level.myE1_random = true;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = false;
    level.myE0_toggle_enabled = false; level.myE1_toggle_enabled = false;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = false;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_NONE;
    level.gC0_offset      = 0.5;       level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 0.5;       level.gC1_wavelength  = 0.5;
    level.gC0_amplitude   = 0.5;       level.gC1_amplitude   = 0.5;
    level.gC0_random = false;          level.gC1_random = false;
    level.allowed_wiggle_room = 500;
    level.playground = false;
    level.return_to_menu = true;
    level.complete = default_completeness;
    levels.push(level);


    dl_play_lvl = n_levels;
    ds_play_lvl = n_levels;
    d_play_lvl = n_levels;
    //lvl8 //double wave playground
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_SIN;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 1.0;
    level.myC0_wavelength = 0.35;      level.myC1_wavelength = 1.0;
    level.myC0_amplitude  = 0.5;       level.myC1_amplitude  = 1.0;
    level.myE0_random = false;         level.myE1_random = false;
    level.myE0_enabled = true;         level.myE1_enabled = true;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_NONE;   level.gC1_type = COMP_TYPE_NONE;
    level.gC0_offset      = 0.5;       level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 0.5;       level.gC1_wavelength  = 0.5;
    level.gC0_amplitude   = 0.5;       level.gC1_amplitude   = 0.5;
    level.gC0_random = false;          level.gC1_random = false;
    level.allowed_wiggle_room = 500;
    level.playground = true;
    level.return_to_menu = true;
    level.complete = default_completeness;
    levels.push(level);

    dl_levels_lvl = n_levels;
    //lvl9 //offset of high freq
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_SIN;
    level.myC0_offset     = 0.44;      level.myC1_offset     = 1.0;
    level.myC0_wavelength = 0.3;       level.myC1_wavelength = 1.0;
    level.myC0_amplitude  = 0.5;       level.myC1_amplitude  = 1.0;
    level.myE0_random = false;         level.myE1_random = false;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_SIN;
    level.gC0_offset      = 0.5;       level.gC1_offset      = 1.0;
    level.gC0_wavelength  = 0.3;       level.gC1_wavelength  = 1.0;
    level.gC0_amplitude   = 0.5;       level.gC1_amplitude   = 1.0;
    level.gC0_random = false;          level.gC1_random = false;
    level.allowed_wiggle_room = 1000;
    level.playground = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    levels.push(level);

    //lvl10 //offset of low freq
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_SIN;
    level.myC0_offset     = 0.3;       level.myC1_offset     = 0.5;
    level.myC0_wavelength = 1.0;       level.myC1_wavelength = 0.3;
    level.myC0_amplitude  = 1.0;       level.myC1_amplitude  = 0.5;
    level.myE0_random = false;         level.myE1_random = false;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_SIN;
    level.gC0_offset      = 0.65;      level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 1.0;       level.gC1_wavelength  = 0.3;
    level.gC0_amplitude   = 1.0;       level.gC1_amplitude   = 0.5;
    level.gC0_random = false;          level.gC1_random = false;
    level.allowed_wiggle_room = 500;
    level.playground = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    levels.push(level);

    //lvl11 //wavelength of high freq
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_SIN;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 0.5;
    level.myC0_wavelength = 0.5;       level.myC1_wavelength = 1.0;
    level.myC0_amplitude  = 0.5;       level.myC1_amplitude  = 1.0;
    level.myE0_random = false;         level.myE1_random = false;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_SIN;
    level.gC0_offset      = 0.5;       level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 0.3;       level.gC1_wavelength  = 1.0;
    level.gC0_amplitude   = 0.5;       level.gC1_amplitude   = 1.0;
    level.gC0_random = false;          level.gC1_random = false;
    level.allowed_wiggle_room = 500;
    level.playground = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    levels.push(level);

    //lvl12 //wavelength of low freq
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_SIN;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 0.5;
    level.myC0_wavelength = 0.5;       level.myC1_wavelength = 0.3;
    level.myC0_amplitude  = 1.0;       level.myC1_amplitude  = 0.5;
    level.myE0_random = false;         level.myE1_random = false;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_SIN;
    level.gC0_offset      = 0.5;       level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 0.9;       level.gC1_wavelength  = 0.3;
    level.gC0_amplitude   = 1.0;       level.gC1_amplitude   = 0.5;
    level.gC0_random = false;          level.gC1_random = false;
    level.allowed_wiggle_room = 500;
    level.playground = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    levels.push(level);

    //lvl13 //zero amp high freq
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_SIN;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 0.3;
    level.myC0_wavelength = 0.45;      level.myC1_wavelength = 1.0;
    level.myC0_amplitude  = 0.0;       level.myC1_amplitude  = 1.0;
    level.myE0_random = false;         level.myE1_random = false;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_SIN;
    level.gC0_offset      = 0.6;       level.gC1_offset      = 0.3;
    level.gC0_wavelength  = 0.45;      level.gC1_wavelength  = 1.0;
    level.gC0_amplitude   = 0.5;       level.gC1_amplitude   = 1.0;
    level.gC0_random = false;          level.gC1_random = false;
    level.allowed_wiggle_room = 500;
    level.playground = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    levels.push(level);

    //lvl14 //zero amp low freq
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_SIN;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 0.3;
    level.myC0_wavelength = 1.0;       level.myC1_wavelength = 0.2;
    level.myC0_amplitude  = 0.0;       level.myC1_amplitude  = 0.5;
    level.myE0_random = false;         level.myE1_random = false;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_SIN;
    level.gC0_offset      = 0.55;      level.gC1_offset      = 0.3;
    level.gC0_wavelength  = 1.0;       level.gC1_wavelength  = 0.2;
    level.gC0_amplitude   = 1.0;       level.gC1_amplitude   = 0.5;
    level.gC0_random = false;          level.gC1_random = false;
    level.allowed_wiggle_room = 500;
    level.playground = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    levels.push(level);

    //lvl15 //all three- low freq
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_SIN;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 0.5;
    level.myC0_wavelength = 1.0;       level.myC1_wavelength = 0.2;
    level.myC0_amplitude  = 1.0;       level.myC1_amplitude  = 0.6;
    level.myE0_random = false;         level.myE1_random = false;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_SIN;
    level.gC0_offset      = 0.4;       level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 0.8;       level.gC1_wavelength  = 0.2;
    level.gC0_amplitude   = 0.5;       level.gC1_amplitude   = 0.6;
    level.gC0_random = false;          level.gC1_random = false;
    level.allowed_wiggle_room = 500;
    level.playground = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    levels.push(level);

    //lvl16 //total interference- low freq
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_SIN;
    level.myC0_offset     = 0.0;       level.myC1_offset     = 1.0;
    level.myC0_wavelength = 1.0;       level.myC1_wavelength = 1.0;
    level.myC0_amplitude  = 1.0;       level.myC1_amplitude  = 1.0;
    level.myE0_random = false;         level.myE1_random = false;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_SIN;
    level.gC0_offset      = 0.5;       level.gC1_offset      = 1.0;
    level.gC0_wavelength  = 1.0;       level.gC1_wavelength  = 1.0;
    level.gC0_amplitude   = 1.0;       level.gC1_amplitude   = 1.0;
    level.gC0_random = false;          level.gC1_random = false;
    level.allowed_wiggle_room = 500;
    level.playground = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    levels.push(level);

    //lvl17 //total interference- med freq
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_SIN;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 0.5;
    level.myC0_wavelength = 0.5;       level.myC1_wavelength = 0.5;
    level.myC0_amplitude  = 0.5;       level.myC1_amplitude  = 0.5;
    level.myE0_random = false;         level.myE1_random = false;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_SIN;
    level.gC0_offset      = 0.63;      level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 0.5;       level.gC1_wavelength  = 0.5;
    level.gC0_amplitude   = 0.5;       level.gC1_amplitude   = 0.5;
    level.gC0_random = false;          level.gC1_random = false;
    level.allowed_wiggle_room = 500;
    level.playground = false;
    level.return_to_menu = true;
    level.complete = default_completeness;
    levels.push(level);

    dl_levels_last_lvl = n_levels;
    //lvl18 //total interference- wavelength
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_SIN;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 0.76;
    level.myC0_wavelength = 0.5;       level.myC1_wavelength = 0.7;
    level.myC0_amplitude  = 0.5;       level.myC1_amplitude  = 0.5;
    level.myE0_random = false;         level.myE1_random = false;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_SIN;
    level.gC0_offset      = 0.5;       level.gC1_offset      = 0.76;
    level.gC0_wavelength  = 0.7;       level.gC1_wavelength  = 0.7;
    level.gC0_amplitude   = 0.5;       level.gC1_amplitude   = 0.5;
    level.gC0_random = false;          level.gC1_random = false;
    level.allowed_wiggle_room = 500;
    level.playground = false;
    level.return_to_menu = true;
    level.complete = default_completeness;
    levels.push(level);

    ds_levels_lvl = n_levels;
    //lvl19 //offset change- reach for correct slider (high freq)
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_SIN;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 0.9;
    level.myC0_wavelength = 1.0;       level.myC1_wavelength = 0.3;
    level.myC0_amplitude  = 1.0;       level.myC1_amplitude  = 0.5;
    level.myE0_random = false;         level.myE1_random = false;
    level.myE0_enabled = true;         level.myE1_enabled = true;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_SIN;
    level.gC0_offset      = 0.5;       level.gC1_offset      = 0.3;
    level.gC0_wavelength  = 1.0;       level.gC1_wavelength  = 0.3;
    level.gC0_amplitude   = 1.0;       level.gC1_amplitude   = 0.5;
    level.gC0_random = false;          level.gC1_random = false;
    level.allowed_wiggle_room = 900;
    level.playground = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    levels.push(level);

    ds_levels_last_lvl = n_levels;
    //lvl20 //offset change- reach for correct slider (low freq)
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_SIN;
    level.myC0_offset     = 0.2;       level.myC1_offset     = 0.5;
    level.myC0_wavelength = 1.0;       level.myC1_wavelength = 0.2;
    level.myC0_amplitude  = 1.0;       level.myC1_amplitude  = 0.5;
    level.myE0_random = false;         level.myE1_random = false;
    level.myE0_enabled = true;         level.myE1_enabled = true;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_SIN;
    level.gC0_offset      = 0.6;       level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 1.0;       level.gC1_wavelength  = 0.2;
    level.gC0_amplitude   = 1.0;       level.gC1_amplitude   = 0.5;
    level.gC0_random = false;          level.gC1_random = false;
    level.allowed_wiggle_room = 500;
    level.playground = false;
    level.return_to_menu = true;
    level.complete = default_completeness;
    levels.push(level);

    d_levels_lvl = n_levels;
    //lvl21 //totally random
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;       level.myC1_type = COMP_TYPE_SIN;
    level.myC0_offset     = 0.5;           level.myC1_offset     = 0.5;
    level.myC0_wavelength = 0.5;           level.myC1_wavelength = 0.5;
    level.myC0_amplitude  = 0.5;           level.myC1_amplitude  = 0.5;
    level.myE0_random = false;             level.myE1_random = false;
    level.myE0_enabled = true;             level.myE1_enabled = true;
    level.myE0_visible = true;             level.myE1_visible = true;
    level.myE0_toggle_enabled = true;      level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;      level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_SIN;        level.gC1_type = COMP_TYPE_SIN;
    level.gC0_offset      = Math.random(); level.gC1_offset      = Math.random();
    level.gC0_wavelength  = Math.random(); level.gC1_wavelength  = Math.random();
    level.gC0_amplitude   = Math.random(); level.gC1_amplitude   = Math.random();
    level.gC0_random = false;              level.gC1_random = false;
    level.allowed_wiggle_room = 500;
    level.playground = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    levels.push(level);








    lvl_clicker = new Clicker({source:stage.dispCanv.canvas});
    play_dragger = new Dragger({source:stage.dispCanv.canvas});
    play_presser = new Presser({source:stage.dispCanv.canvas});
    play_clicker = new Clicker({source:stage.dispCanv.canvas});

    clip = new ClipBoard(20,20,self.c.width-40,self.c.height-20,self,levels);

    e0AnimDisplay = new CompositionAnimationDrawer(myC0,  nullC, 100, graph_min_x, graph_max_x, graph_min_y, graph_max_y, myE0.x+10, myE0.y+10, myE0.w-20, (myE0.h/2)-10);
    e1AnimDisplay = new CompositionAnimationDrawer(nullC, myC1,  100, graph_min_x, graph_max_x, graph_min_y, graph_max_y, myE1.x+10, myE1.y+10, myE1.w-20, (myE1.h/2)-10);
    myAnimDisplay = new CompositionAnimationDrawer(myC0,  myC1,  100, graph_min_x, graph_max_x, graph_min_y, graph_max_y, 10, 10, self.c.width-20, (self.c.height-20)/2);

    gC0 = new Component(COMP_TYPE_SIN, graph_default_offset, graph_default_wavelength, graph_default_amplitude);
    gC1 = new Component(COMP_TYPE_NONE, graph_default_offset, graph_default_wavelength, graph_default_amplitude);
    gComp = new Composition(gC0, gC1);
    gDisplay = new GraphDrawer(gComp,   graph_n_samples, graph_min_x, graph_max_x, graph_min_y, graph_max_y,                  10,                 10,     self.c.width-20, ((self.c.height-20)/2));
    gDisplay.draw_zero_x = false;
    gDisplay.draw_zero_y = true;
    gDisplay.lineWidth = 4;
    gDisplay.color = "#00BB00";

    menuButton  = new ButtonBox(10, 10, 80, 20, function(on) { self.setMode(GAME_MODE_LVL); });
    readyButton = new ButtonBox(self.c.width-10-80, 10, 80, 20, function(on) { if(levels[cur_level].playground || (validator.delta < levels[cur_level].allowed_wiggle_room && myE0.goal_contribution == 1 && myE1.goal_contribution == 1)) { levels[cur_level].complete = true; if(levels[cur_level].return_to_menu) self.setMode(GAME_MODE_LVL); else self.nextLevel(); } });
    composeButton = new ButtonBox((self.c.width/2)-20, self.c.height/2+10, 40, (self.c.height/2)-20, function(on) { if(levels[cur_level].myE1_visible) self.animateComposition(); });
    composeButton.draw = function(canv)
    {
      if(composeButton.down) canv.context.strokeStyle = "#00F400";
      else          canv.context.strokeStyle = "#000000";

      canv.context.fillStyle = "#00F400";

      var max_p = (myAnimDisplay.n_samples*2)+myAnimDisplay.frames_per_sample;
      if(!levels[cur_level].myE1_visible) max_p = myAnimDisplay.n_samples+myAnimDisplay.frames_per_sample;
      if(max_p < myAnimDisplay.progress) max_p = myAnimDisplay.progress;
      canv.context.fillRect(composeButton.x,composeButton.y,composeButton.w,(composeButton.h*myAnimDisplay.progress/max_p));
      canv.context.strokeRect(composeButton.x+0.5,composeButton.y+0.5,composeButton.w,composeButton.h);
    }

    readyButton = new ButtonBox(self.c.width-10-80, 10, 80, 20, function(on) { if(levels[cur_level].playground || (validator.delta < levels[cur_level].allowed_wiggle_room && myE0.goal_contribution == 1 && myE1.goal_contribution == 1)) { levels[cur_level].complete = true; if(levels[cur_level].return_to_menu) self.setMode(GAME_MODE_LVL); else self.nextLevel(); } });
    skipButton = new ButtonBox(self.c.width-10-80, 50, 80, 20, function(on) { if(!levels[cur_level].playground == 1 && levels[cur_level].complete) { if(levels[cur_level].return_to_menu) self.setMode(GAME_MODE_LVL); else self.nextLevel(); } });
    if(print_debug)
      printButton = new ButtonBox(self.c.width-10-80, 50, 80, 20, function(on) { self.print(); });

    validator = new Validator(myComp, gComp, graph_min_x, graph_max_x, graph_n_samples);
    vDrawer = new ValidatorDrawer(10, 10+((self.c.height-20)/2)-20, self.c.width-20, 20, validator);


    clip.register(lvl_clicker);

    myE0.register(play_dragger, play_presser, play_clicker);
    myE1.register(play_dragger, play_presser, play_clicker);
    play_presser.register(menuButton);
    play_presser.register(readyButton);
    play_presser.register(composeButton);
    play_presser.register(skipButton);
    if(print_debug)
      play_presser.register(printButton);
    play_clicker.register(menuButton);
    play_clicker.register(readyButton);
    play_clicker.register(composeButton);
    play_clicker.register(skipButton);
    if(print_debug)
      play_clicker.register(printButton);


    //self.beginLevel(levels[cur_level]);
    self.setMode(GAME_MODE_LVL);
  };

  self.requestLevel = function(lvl)
  {
    cur_level = lvl;
    self.beginLevel(levels[cur_level]);
    self.setMode(GAME_MODE_PLAY);
  }

  self.beginLevel = function(level)
  {
    myC0.type = level.myC0_type;
    myC1.type = level.myC1_type;
    myE0.setDefaults(level.myC0_offset, level.myC0_wavelength, level.myC0_amplitude);
    myE1.setDefaults(level.myC1_offset, level.myC1_wavelength, level.myC1_amplitude);
    myE0.hardReset();
    myE1.hardReset();
    myE0.enabled = level.myE0_enabled;
    myE0.visible = level.myE0_visible;
    myE0.toggle_enabled = level.myE0_toggle_enabled;
    myE0.toggle_default = level.myE0_toggle_default; myE0.toggle_button.set(level.myE0_toggle_default);
    if(myE0.toggle_default) myE0.component.contribution = 1;
    else                    myE0.component.contribution = 0;
    myE1.enabled = level.myE1_enabled;
    myE1.visible = level.myE1_visible;
    myE1.toggle_enabled = level.myE1_toggle_enabled;
    myE1.toggle_default = level.myE1_toggle_default; myE1.toggle_button.set(level.myE1_toggle_default);
    if(myE1.toggle_default) myE1.component.contribution = 1;
    else                    myE1.component.contribution = 0;

    gC0.set(level.gC0_type, level.gC0_offset, level.gC0_wavelength, level.gC0_amplitude);
    gC1.set(level.gC1_type, level.gC1_offset, level.gC1_wavelength, level.gC1_amplitude);

    myC0.dirty();
    myC1.dirty();

    validator.dirty();

    e0AnimDisplay.progress = 0; e0AnimDisplay.intended_progress = 0;
    e1AnimDisplay.progress = 0; e1AnimDisplay.intended_progress = 0;
    myAnimDisplay.progress = 0; myAnimDisplay.intended_progress = 0;

    if(level.playground) level.complete = true;
  }

  self.nextLevel = function()
  {
    cur_level = (cur_level+1)%n_levels;
    self.beginLevel(levels[cur_level]);
  }

  self.print = function()
  {
    console.log("myE0: (on lvl "+cur_level+")");
    console.log("offset: "+myE0.offset_slider.pixelAtVal(myE0.offset_slider.val)/144);
    console.log("wavelength: "+myE0.wavelength_slider.pixelAtVal(myE0.wavelength_slider.val)/144);
    console.log("amplitude: "+myE0.amplitude_slider.pixelAtVal(myE0.amplitude_slider.val)/144);
    console.log("myE1: (on lvl "+cur_level+")");
    console.log("offset: "+myE1.offset_slider.pixelAtVal(myE1.offset_slider.val)/144);
    console.log("wavelength: "+myE1.wavelength_slider.pixelAtVal(myE1.wavelength_slider.val)/144);
    console.log("amplitude: "+myE1.amplitude_slider.pixelAtVal(myE1.amplitude_slider.val)/144);
    console.log("error: "+validator.delta);
    console.log("");
  }

  self.animateComposition = function()
  {
    if(myAnimDisplay.intended_progress == 0)
    {
      e0AnimDisplay.animateForward();
      e1AnimDisplay.animateForward();
      myAnimDisplay.animateForward();
    }
    else
    {
      e0AnimDisplay.animateBackward(!levels[cur_level].myE1_visible);
      e1AnimDisplay.animateBackward(!levels[cur_level].myE1_visible);
      myAnimDisplay.animateBackward(!levels[cur_level].myE1_visible);
    }
  }

  self.setMode = function(mode)
  {
    lvl_clicker.ignore();
    play_dragger.ignore();
    play_presser.ignore();
    play_clicker.ignore();
    game_mode = mode;

    clip.dirty();
    if(game_mode == GAME_MODE_LVL)
      clip.desired_y = 20;
    else
      clip.desired_y = 500;
  }

  var t = 0;
  self.tick = function()
  {
    if(game_mode == GAME_MODE_LVL)
    {
      lvl_clicker.flush();
    }
    else if(game_mode == GAME_MODE_PLAY)
    {
      play_dragger.flush();
      play_presser.flush();
      play_clicker.flush();
    }

    clip.tick();
    myE0.tick();
    myE1.tick();

    if(myE0.isDragging())
    {
      myDisplay.draw_zero_x = true;
      myDisplay.draw_zero_x_at_offset = myE0.component.offset;
    }
    else if(myE1.isDragging())
    {
      myDisplay.draw_zero_x = true;
      myDisplay.draw_zero_x_at_offset = myE1.component.offset;
    }
    else
    {
      if(myDisplay.draw_zero_x) myDisplay.dirty();
      myDisplay.draw_zero_x = false;
    }

    e0AnimDisplay.tick();
    e1AnimDisplay.tick();
    myAnimDisplay.tick();

    if(!levels[cur_level].playground)
      validator.validate(levels[cur_level].allowed_wiggle_room)

    t += 0.05;
    if(t > Math.PI) t-=Math.PI;
  };

  self.draw = function()
  {
    if(!levels[cur_level].playground)
    {
      self.dc.context.globalAlpha = ((Math.sin(t)+1)/2)*0.8;
      gDisplay.draw(self.dc);
      self.dc.context.globalAlpha = 1;
    }

    var redComponent = "00";
    var blueComponent = "00";
    if(myE0.visible && myE0.component.enabled)
      redComponent = decToHex(Math.floor(myE0.component.contribution*255),2);
    if(myE1.visible && myE1.component.enabled)
      blueComponent = decToHex(Math.floor(myE1.component.contribution*255),2);

    myDisplay.color = "#"+redComponent+"00"+blueComponent;

    myDisplay.draw(self.dc);
    myE0.draw(self.dc);
    myE1.draw(self.dc);
    e0AnimDisplay.draw(self.dc);
    e1AnimDisplay.draw(self.dc);
    myAnimDisplay.draw(self.dc);

    if(levels[cur_level].playground || (validator.delta < levels[cur_level].allowed_wiggle_room && myE0.goal_contribution == 1 && myE1.goal_contribution == 1))
      readyButton.draw(self.dc);
    if(!levels[cur_level].playground)
      vDrawer.draw(levels[cur_level].allowed_wiggle_room, self.dc);

    menuButton.draw(self.dc);
    if(!levels[cur_level].playground == 1 && levels[cur_level].complete)
      skipButton.draw(self.dc);
    if(print_debug)
      printButton.draw(self.dc);

    if(levels[cur_level].myE1_visible)
      composeButton.draw(self.dc);

    clip.draw(self.dc);

    clip.cleanse();
    myComp.cleanse();
    myDisplay.cleanse();
    gComp.cleanse();
    gDisplay.cleanse();
    myE0.graph.cleanse();
    myE1.graph.cleanse();
    e0AnimDisplay.cleanse();
    e1AnimDisplay.cleanse();
    myAnimDisplay.cleanse();
  };

  self.cleanup = function()
  {
  };
};

