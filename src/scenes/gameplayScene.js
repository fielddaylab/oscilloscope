var default_completeness = 0;
var print_debug = false;
var placer_debug = false;

var dbugger;

var graph_n_samples = 500;
var graph_min_x = -50;
var graph_max_x =  50;
var graph_min_y = -50;
var graph_max_y =  50;
var graph_min_offset = graph_min_x;
var graph_default_offset = (graph_min_x+graph_max_x)/2;
var graph_max_offset = graph_max_x;
var graph_min_wavelength = 2;
var graph_default_wavelength = (2+(graph_max_x*2))/2;
var graph_max_wavelength = graph_max_x*2;
var graph_min_amplitude = 0;
var graph_default_amplitude = graph_max_y/4;
var graph_max_amplitude = graph_max_y*(3/5);

var s_play_lvl = 0;
var s_levels_lvl = 0;
var s_levels_last_lvl = 0;
var s_random_lvl = 0;
var s_create_lvl = 0;

var pl_play_lvl = 0;
var pl_levels_lvl = 0;
var pl_levels_last_lvl = 0;
var pl_random_lvl = 0;
var pl_create_lvl = 0;

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
var COMP_TYPE_PULSE  = ENUM; ENUM++;
var COMP_TYPE_SIN    = ENUM; ENUM++;
var COMP_TYPE_SQUARE = ENUM; ENUM++;

ENUM = 0;
var GAME_MODE_MENU  = ENUM; ENUM++;
var GAME_MODE_PLAY  = ENUM; ENUM++;
var GAME_MODE_BLURB = ENUM; ENUM++;
var game_mode = GAME_MODE_MENU;

var nullEditor; //HACK!

var Component = function(type, direction, offset, wavelength, amplitude)
{
  var self = this;
  self.type = type;
  self.direction = direction;
  self.offset = offset;
  self.wavelength = wavelength;
  self.amplitude = amplitude;
  self.enabled = true;
  self.contribution = 1.0;

  self.timer = 0;
  self.playing = false;

  self._dirty = true;

  self.set = function(type, dir, offset, wavelength, amplitude)
  {
    self.type = type;
    self.direction = direction;
    self.offset     = nullEditor.pix2Off(Math.round(offset     * nullEditor.offset_slider.maxPixel()     ));
    self.wavelength = nullEditor.pix2Wav(Math.round(wavelength * nullEditor.wavelength_slider.maxPixel() ));
    self.amplitude  = nullEditor.pix2Amp(Math.round(amplitude  * nullEditor.amplitude_slider.maxPixel()  ));
    self.dirty();
  }

  self.f = function(x)
  {
    if(!self.enabled) return 0;

    x += self.timer*-self.direction;
    x -= self.offset;
    var y = 0;

    switch(self.type)
    {
      case COMP_TYPE_NONE:
        break;
      case COMP_TYPE_PULSE:
        while(x < graph_min_x) x += (graph_max_x-graph_min_x);
        while(x > graph_max_x) x -= (graph_max_x-graph_min_x);
        x /= (self.wavelength/2);
        x += 1;
             if(x < 0) y = 0;
        else if(x > 2) y = 0;
        else
        {
          y = Math.cos(x*Math.PI);
          y = -(y-1)*(self.amplitude-graph_max_amplitude/2);
        }
        break;
      case COMP_TYPE_SIN:
        x /= self.wavelength;
        y = Math.sin(x*(2*Math.PI));
        y *= self.amplitude;
        break;
      case COMP_TYPE_SQUARE:
        x /= self.wavelength;
        if(Math.floor(x)%2) y = -1;
        else                y = 1;
        y *= self.amplitude;
        break;
      default:
        break;
    }
    return y*self.contribution;
  }

  self.setPlaying = function(p)
  {
    self.playing = p;
    self.timer = 0;
    self.dirty();
  }

  self.tick = function()
  {
    if(self.playing) { self.timer += 0.3; self.dirty(); }
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

var GraphDrawer = function(composition, x, y, w, h)
{
  var self = this;
  self.composition = composition;

  self.x = x;
  self.y = y;
  self.w = w;
  self.h = h;

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
  self.dotted = false;
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
          x = mapRange(graph_max_x,graph_min_x,self.composition.offset,self.w,0)
        else
          x = mapRange(graph_max_x,graph_min_x,self.draw_zero_x_at_offset,self.w,0)
        self.canv.context.moveTo(x+0.5,0);
        self.canv.context.lineTo(x+0.5,self.h);
        self.canv.context.stroke();
      }

      self.canv.context.strokeStyle = self.color;
      self.canv.context.lineWidth = self.lineWidth;

      self.canv.context.beginPath();
      sample = self.composition.f(graph_min_x);
      self.canv.context.moveTo(0,mapRange(graph_min_y,graph_max_y,sample,self.h,0));

      var pen_down = true;
      for(var i = 1; i < graph_n_samples; i++)
      {
        if(!self.dotted || i%4 < 3)
        {
          t = i/(graph_n_samples-1);
          sample = self.composition.f(lerp(graph_min_x,graph_max_x,t));

          if(!pen_down)
          {
            self.canv.context.beginPath();
            self.canv.context.moveTo(t*self.w,mapRange(graph_min_y,graph_max_y,sample,self.h,0));
            pen_down = true;
          }
          else self.canv.context.lineTo(t*self.w,mapRange(graph_min_y,graph_max_y,sample,self.h,0));
        }
        else
        {
          if(pen_down)
          {
            self.canv.context.stroke();
            pen_down = false;
          }
        }
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

var CompositionAnimationDrawer = function(component_a, component_b, x, y, w, h)
{
  var self = this;
  self.component_a = component_a;
  self.component_b = component_b;

  self.x = x;
  self.y = y;
  self.w = w;
  self.h = h;

  self.n_samples = graph_n_samples/2;

  self.canv; //gets initialized in position

  self.lineWidth = 2;
  self._dirty = true;
  self.frames_per_sample = 160;

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

        sample = self.component_a.f(lerp(graph_min_x,graph_max_x,t));
        y_a = mapRange(graph_min_y,graph_max_y,sample,self.h,0);
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
          sample = self.component_b.f(lerp(graph_min_x,graph_max_x,t));
          y_b = mapRange(graph_min_y,graph_max_y,sample,self.h,0);

          h = y_b-self.h/2;
          allowed_dist = Math.abs((self.progress-i)/self.frames_per_sample);
          allowed_dist *= self.h/2;
          if(self.progress < (i+self.frames_per_sample) && Math.abs(h) > allowed_dist)
          {
            if(h < 0) h = -allowed_dist;
            else      h = allowed_dist;
          }

          self.canv.context.fillStyle = "#0000FF";
          self.canv.context.fillRect(x,self.h/2+(y_a-self.h/2),1,h);
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
    if(self.progress < self.intended_progress) { self.progress+=10; self.dirty(); if(self.progress > self.intended_progress) self.progress = self.intended_progress; }
    if(self.progress > self.intended_progress) { self.progress-=10; self.dirty(); if(self.progress < self.intended_progress) self.progress = self.intended_progress; }
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

var ComponentEditor = function(component, color, x,y,w,h)
{
  var self = this;
  self.component = component;

  self.color = color;

  self.x = x;
  self.y = y;
  self.w = w;
  self.h = h;

  self.default_offset = graph_default_offset;
  self.default_wavelength = graph_default_wavelength;
  self.default_amplitude = graph_default_amplitude;

  self.graph = new GraphDrawer(self.component, self.x+10, self.y+10, self.w-20, (self.h-20)/2);
  self.graph.color = self.color;
  self.graph.draw_zero_x = true;
  self.graph.draw_zero_y = true;
  var b_h = ((self.h/2)-(4*10))/3;
  self.reset_button  = new ButtonBox(self.x+self.w-10-30, self.y+(self.h/2)+(10*1)+b_h*0, 30, b_h, function(on) { if(!self.enabled || !self.component.enabled || self.component.playing) return; self.reset(); });
  self.toggle_button = new ToggleBox(self.x+self.w-10-30, self.y+(self.h/2)+(10*2)+b_h*1, 30, b_h, true, function(on) { if(!self.toggle_enabled) return; if(on) self.goal_contribution = 1; else self.goal_contribution = 0; });
  self.play_button   = new ToggleBox(self.x+self.w-10-30, self.y+(self.h/2)+(10*3)+b_h*2, 30, b_h, true, function(on) { self.component.setPlaying(!on); });
  self.goal_contribution = 1;

  self.amplitude_slider  = new SmoothSliderBox(    self.x+10+30, self.y+self.h/2+10,          self.w-10-self.reset_button.w-10-20-10-10-30, 20, graph_min_amplitude,   graph_max_amplitude,  self.default_amplitude, function(n) { if(!self.enabled || !self.component.enabled || self.component.playing) { self.amplitude_slider.val  = self.component.amplitude;  self.amplitude_slider.desired_val  = self.component.amplitude;  } else { self.component.amplitude  = n; self.component.dirty(); } });
  self.wavelength_slider = new SmoothSliderSqrtBox(self.x+10+30, self.y+self.h/2+self.h/4-10, self.w-10-self.reset_button.w-10-20-10-10-30, 20, graph_min_wavelength, graph_max_wavelength, self.default_wavelength, function(n) { if(!self.enabled || !self.component.enabled || self.component.playing) { self.wavelength_slider.val = self.component.wavelength; self.wavelength_slider.desired_val = self.component.wavelength; } else { self.component.wavelength = n; self.component.dirty(); } });
  self.offset_slider     = new SmoothSliderBox(    self.x+10+30, self.y+self.h-10-20,         self.w-10-self.reset_button.w-10-20-10-10-30, 20, graph_min_offset,         graph_max_offset,     self.default_offset, function(n) { if(!self.enabled || !self.component.enabled || self.component.playing) { self.offset_slider.val     = self.component.offset;     self.offset_slider.desired_val     = self.component.offset;     } else { self.component.offset     = n; self.component.dirty(); } });

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

    presser.register(self.play_button);
    clicker.register(self.play_button);

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

    self.reset_button.draw(canv); canv.context.fillStyle = "#000000"; canv.context.fillText("reset",self.reset_button.x+5,self.reset_button.y+15);
    if(self.toggle_enabled)
    {
      self.toggle_button.draw(canv);
      canv.context.fillStyle = "#000000";
      canv.context.fillText("on/off",self.toggle_button.x,self.toggle_button.y+15);
    }
    self.play_button.draw(canv); canv.context.fillStyle = "#000000"; canv.context.fillText("> / ||",self.play_button.x+5,self.play_button.y+15);

    self.offset_dec_button.draw(canv);     canv.context.fillStyle = "#000000"; canv.context.fillText("<",self.offset_dec_button.x+10,self.offset_dec_button.y+15);
    self.offset_inc_button.draw(canv);     canv.context.fillStyle = "#000000"; canv.context.fillText(">",self.offset_inc_button.x+10,self.offset_inc_button.y+15);
    self.wavelength_dec_button.draw(canv); canv.context.fillStyle = "#000000"; canv.context.fillText("<",self.wavelength_dec_button.x+10,self.wavelength_dec_button.y+15);
    self.wavelength_inc_button.draw(canv); canv.context.fillStyle = "#000000"; canv.context.fillText(">",self.wavelength_inc_button.x+10,self.wavelength_inc_button.y+15);
    self.amplitude_dec_button.draw(canv);  canv.context.fillStyle = "#000000"; canv.context.fillText("<",self.amplitude_dec_button.x+10,self.amplitude_dec_button.y+15);
    self.amplitude_inc_button.draw(canv);  canv.context.fillStyle = "#000000"; canv.context.fillText(">",self.amplitude_inc_button.x+10,self.amplitude_inc_button.y+15);

    canv.context.lineWidth = 1;
    canv.context.strokeStyle = "#000000";
    self.offset_slider.draw(canv); canv.context.fillText("offset",self.offset_slider.x,self.offset_slider.y);
    self.wavelength_slider.draw(canv); canv.context.fillText("wavelength",self.wavelength_slider.x,self.wavelength_slider.y);
    self.amplitude_slider.draw(canv); canv.context.fillText("amplitude",self.amplitude_slider.x,self.amplitude_slider.y);
    canv.context.strokeRect(self.x+0.5,self.y+0.5,self.w,self.h);

    if(!self.enabled)
    {
      canv.context.fillStyle = "rgba(100,100,100,0.5)";
      canv.context.fillRect(self.x,self.y,self.w,self.h);
    }
  }
}

var Validator = function(myC, gC)
{
  var self = this;

  self.myC = myC;
  self.gC  = gC;

  self.res = graph_n_samples/8;

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
    for(var i = 0; i < self.res; i++)
    {
      t = i/(self.res-1);
      var sample_x = lerp(graph_min_x,graph_max_x,t);
      s0 = self.myC.f(sample_x);
      s1 = self.gC.f(sample_x);
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

  self.allowed_wiggle_room = 0; //make sure you change this- incredibly strict
  self.playground = false;

  self.blurb = false;
  self.blurb_x = 0;
  self.blurb_y = 0;
  self.blurb_w = 0;
  self.blurb_h = 0;
  self.blurb_txt = "";
  self.blurb_txt_x = 0;
  self.blurb_txt_y = 0;
  self.blurb_txt_w = 0;
  self.blurb_txt_h = 0;
  self.blurb_img = "";
  self.blurb_img_x = 0;
  self.blurb_img_y = 0;
  self.blurb_img_w = 0;
  self.blurb_img_h = 0;
  self.blurb_seen = false;
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
  self.dismiss_button = new ButtonBox(self.w-20-20,20,20,20, function(on) { if(!levels[self.s_levels.req_lvl].complete) scene.requestLevel(s_play_lvl); else scene.setMode(GAME_MODE_PLAY); }); self.buttons.push(self.dismiss_button);
  self.dismiss_button.draw = function(canv)
  {
    if(this.down) canv.context.strokeStyle = "#00F400";
    else          canv.context.strokeStyle = "#000000";

    canv.context.fillStyle = "#00F400";

    canv.context.fillRect(this.off_x,this.off_y,this.w,this.h);
    canv.context.strokeRect(this.off_x+0.5,this.off_y+0.5,this.w,this.h);
  }

  var bs = 70;
  //sections: s (single), pl (pulse locked), dl (double locked), ds (double single), d (double)
  self.s_play   = new ButtonBox(20+((bs+10)*0),20+((bs+10)*0),bs,bs, function(on) { /* the one level that's always unlocked */ scene.requestLevel(s_play_lvl); });  self.s_play.req_lvl   = -1;                self.s_play.title_a = "single wave";   self.s_play.title_b = "playground"; self.buttons.push(self.s_play);
  self.s_levels = new ButtonBox(20+((bs+10)*1),20+((bs+10)*0),bs,bs, function(on) { if(levels[self.s_levels.req_lvl].complete) scene.requestLevel(s_levels_lvl);}); self.s_levels.req_lvl = s_play_lvl;        self.s_levels.title_a = "single wave"; self.s_levels.title_b = "levels";   self.buttons.push(self.s_levels);
  self.s_random = new ButtonBox(20+((bs+10)*2),20+((bs+10)*0),bs,bs, function(on) { if(levels[self.s_random.req_lvl].complete) scene.requestLevel(s_random_lvl);}); self.s_random.req_lvl = s_levels_last_lvl; self.s_random.title_a = "single wave"; self.s_random.title_b = "random";   self.buttons.push(self.s_random);
  //self.s_create = new ButtonBox(20+((bs+10)*3),20+((bs+10)*0),bs,bs, function(on) { if(levels[self.s_create.req_lvl].complete) scene.requestLevel(s_create_lvl);}); self.s_create.req_lvl = s_levels_last_lvl; self.buttons.push(self.s_create);

  self.pl_play   = new ButtonBox(20+((bs+10)*0),20+((bs+10)*1),bs,bs, function(on) { if(levels[self.pl_play.req_lvl].complete)   scene.requestLevel(pl_play_lvl); });  self.pl_play.req_lvl   = s_levels_last_lvl;  self.pl_play.title_a = "pulse interference";   self.pl_play.title_b = "playground";   self.buttons.push(self.pl_play);
  self.pl_levels = new ButtonBox(20+((bs+10)*1),20+((bs+10)*1),bs,bs, function(on) { if(levels[self.pl_levels.req_lvl].complete) scene.requestLevel(pl_levels_lvl);}); self.pl_levels.req_lvl = pl_play_lvl;        self.pl_levels.title_a = "pulse interference"; self.pl_levels.title_b = "levels"; self.buttons.push(self.pl_levels);
  self.pl_random = new ButtonBox(20+((bs+10)*2),20+((bs+10)*1),bs,bs, function(on) { if(levels[self.pl_random.req_lvl].complete) scene.requestLevel(pl_random_lvl);}); self.pl_random.req_lvl = pl_levels_last_lvl; self.pl_random.title_a = "pulse interference"; self.pl_random.title_b = "random"; self.buttons.push(self.pl_random);
  //self.pl_create = new ButtonBox(20+((bs+10)*3),20+((bs+10)*1),bs,bs, function(on) { if(levels[self.pl_create.req_lvl].complete) scene.requestLevel(pl_create_lvl);}); self.pl_create.req_lvl = pl_levels_last_lvl; self.buttons.push(self.pl_create);

  self.d_play    = new ButtonBox(20+((bs+10)*0),20+((bs+10)*2),bs,bs*3+20, function(on) { if(levels[self.d_play.req_lvl].complete)    scene.requestLevel(d_play_lvl);});    self.d_play.req_lvl    = pl_levels_last_lvl; self.d_play.title_a = "wave interference";    self.d_play.title_b = "playground"; self.buttons.push(self.d_play);
  self.dl_levels = new ButtonBox(20+((bs+10)*1),20+((bs+10)*2),bs,bs,      function(on) { if(levels[self.dl_levels.req_lvl].complete) scene.requestLevel(dl_levels_lvl);}); self.dl_levels.req_lvl = dl_play_lvl;        self.dl_levels.title_a = "wave interference"; self.dl_levels.title_b = "levels";  self.buttons.push(self.dl_levels);
  self.dl_random = new ButtonBox(20+((bs+10)*2),20+((bs+10)*2),bs,bs,      function(on) { if(levels[self.dl_random.req_lvl].complete) scene.requestLevel(dl_random_lvl);}); self.dl_random.req_lvl = dl_levels_last_lvl; self.dl_random.title_a = "wave interference"; self.dl_random.title_b = "random";  self.buttons.push(self.dl_random);
  //self.dl_create = new ButtonBox(20+((bs+10)*3),20+((bs+10)*2),bs,bs,      function(on) { if(levels[self.dl_create.req_lvl].complete) scene.requestLevel(dl_create_lvl);}); self.dl_create.req_lvl = dl_levels_last_lvl; self.buttons.push(self.dl_create);

  self.ds_levels = new ButtonBox(20+((bs+10)*1),20+((bs+10)*3),bs,bs, function(on) { if(levels[self.ds_levels.req_lvl].complete) scene.requestLevel(ds_levels_lvl);}); self.ds_levels.req_lvl = dl_levels_last_lvl; self.ds_levels.title_a = "wave interference"; self.ds_levels.title_b = "levels medium";  self.buttons.push(self.ds_levels);
  self.ds_random = new ButtonBox(20+((bs+10)*2),20+((bs+10)*3),bs,bs, function(on) { if(levels[self.ds_random.req_lvl].complete) scene.requestLevel(ds_random_lvl);}); self.ds_random.req_lvl = ds_levels_last_lvl; self.ds_random.title_a = "wave interference"; self.ds_random.title_b  = "random medium"; self.buttons.push(self.ds_random);
  //self.d_create = new ButtonBox(20+((bs+10)*3),20+((bs+10)*3),bs,bs*2+10, function(on) { if(levels[self.d_create.req_lvl].complete) scene.requestLevel(d_create_lvl);}); self.d_create.req_lvl = ds_levels_last_lvl; self.buttons.push(self.d_create);

  self.d_levels = new ButtonBox(20+((bs+10)*1),20+((bs+10)*4),bs,bs, function(on) { if(levels[self.d_levels.req_lvl].complete) scene.requestLevel(d_levels_lvl);}); self.d_levels.req_lvl = ds_levels_last_lvl; self.d_levels.title_a = "wave interference"; self.d_levels.title_b = "levels hard";   self.buttons.push(self.d_levels);
  self.d_random = new ButtonBox(20+((bs+10)*2),20+((bs+10)*4),bs,bs, function(on) { if(levels[self.d_random.req_lvl].complete) scene.requestLevel(d_random_lvl);}); self.d_random.req_lvl = d_levels_last_lvl;  self.d_random.title_a = "wave interference"; self.d_random.title_b = "random hard"; self.buttons.push(self.d_random);

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
    canv.context.fillStyle = "#000000";
    canv.context.fillText(this.title_a,this.off_x+10,this.off_y+20);
    canv.context.fillText(this.title_b,this.off_x+10,this.off_y+50);
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

var Blurb = function(scene)
{
  var self = this;
  self.x = 0;
  self.y = 0;
  self.w = 0;
  self.h = 0;
  self.txt = "";
  self.lines;
  self.txt_x = 0;
  self.txt_y = 0;
  self.txt_w = 0;
  self.txt_h = 0;
  self.img = "";
  self.img_x = 0;
  self.img_y = 0;
  self.img_w = 0;
  self.img_h = 0;
  self.img_el;

  self.format = function(canv)
  {
    self.lines = [];
    var found = 0;
    var searched = 0;
    var tentative_search = 0;

    //stage.drawCanv.context.font=whaaaat;
    while(found < self.txt.length)
    {
      searched = self.txt.indexOf(" ",found);
      if(searched == -1) searched = self.txt.length;
      tentative_search = self.txt.indexOf(" ",searched+1);
      if(tentative_search == -1) tentative_search = self.txt.length;
      while(canv.context.measureText(self.txt.substring(found,tentative_search)).width < self.txt_w && searched != self.txt.length)
      {
        searched = tentative_search;
        tentative_search = self.txt.indexOf(" ",searched+1);
        if(tentative_search == -1) tentative_search = self.txt.length;
      }
      if(self.txt.substring(searched, searched+1) == " ") searched++;
      self.lines.push(self.txt.substring(found,searched));
      found = searched;
    }

    if(self.img && self.img.length)
    {
      self.img_el = new Image();
      self.img_el.src = "assets/"+self.img+".png";
    }
    else
      self.img_el = undefined;
  }

  self.draw = function(canv)
  {
    canv.context.fillStyle = "#FFFFFF";
    canv.context.fillRect(self.x,self.y,self.w,self.h);
    canv.context.strokeStyle = "#000000";
    canv.context.strokeRect(self.x,self.y,self.w,self.h);

    canv.context.fillStyle = "#000000";
    for(var i = 0; i < self.lines.length; i++)
    {
      canv.context.fillText(self.lines[i],self.txt_x,self.txt_y+(i*15),self.txt_w);
    }

    if(self.img_el)
    {
      canv.context.drawImage(self.img_el, self.img_x, self.img_y, self.img_w, self.img_h);
    }

    canv.context.fillText("(click to dismiss)",self.x+10,self.y+self.h-10,self.w);
  }

  self.click = function(evt)
  {
    scene.setMode(GAME_MODE_PLAY);
  }
}

var GamePlayScene = function(game, stage)
{
  var self = this;
  self.dc = stage.drawCanv;
  self.c = self.dc.canvas;

  var menu_clicker;
  var blurb_clicker;
  var play_dragger;
  var play_presser;
  var play_clicker;
  var placer_clicker;
  var placer_dragger;

  var placer;
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
  var g2Display;

  var blurb;

  var menuButton;
  var readyButton;
  var skipButton;
  var printButton;

  var composeButton;

  var validator;
  var vDrawer;

  var cur_level;
  var n_levels;
  var levels;

  self.ready = function()
  {
    dbugger = new Debugger({source:document.getElementById("debug_div")});
    if(placer_debug)
    {
      placer = new Placer({},100,100,100,100);
    }
    var level;
    cur_level = 0;
    n_levels = 0;
    levels = [];

    nullC = new Component(COMP_TYPE_NONE, 0, 0, 0, 0);
    myC0 = new Component(COMP_TYPE_SIN, 1, graph_default_offset, graph_default_wavelength, graph_default_amplitude);
    myC1 = new Component(COMP_TYPE_NONE, -1, graph_default_offset, graph_default_wavelength, graph_default_amplitude);
    myComp = new Composition(myC0, myC1);
    myDisplay = new GraphDrawer(myComp, 10, 10, self.c.width-20, ((self.c.height-20)/2));
    myDisplay.color = "#FF00FF";
    myDisplay.draw_zero_x = false;
    myDisplay.draw_zero_x_at_composition = false;
    myDisplay.draw_zero_y = true;
    nullEditor = new ComponentEditor(myC0, "#FF0000",                     10, self.c.height/2+10, (self.c.width/2)-20-20,   (self.c.height/2)-20);
    myE0 = new ComponentEditor(myC0, "#FF0000",                     10, self.c.height/2+10, (self.c.width/2)-20-20,   (self.c.height/2)-20);
    myE1 = new ComponentEditor(myC1, "#0000FF", (self.c.width/2)+10+20, self.c.height/2+10, (self.c.width/2)-20-20,   (self.c.height/2)-20);

    s_play_lvl = n_levels;
    //lvl? //single-wave playground
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_NONE;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 0.5;
    level.myC0_wavelength = 0.5;       level.myC1_wavelength = 0.5;
    level.myC0_amplitude  = 0.5;       level.myC1_amplitude  = 0.5;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = false;
    level.myE0_toggle_enabled = false; level.myE1_toggle_enabled = false;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = false;
    level.gC0_type = COMP_TYPE_NONE;   level.gC1_type = COMP_TYPE_NONE;
    level.gC0_offset      = 0.5;       level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 0.5;       level.gC1_wavelength  = 0.5;
    level.gC0_amplitude   = 0.5;       level.gC1_amplitude   = 0.5;
    level.allowed_wiggle_room = 500;
    level.playground = true;
    level.random = false;
    level.create = false;
    level.return_to_menu = true;
    level.complete = default_completeness;
    level.blurb = true;
    level.blurb_x = 310;
    level.blurb_y = 25;
    level.blurb_w = 235;
    level.blurb_h = 70;
    level.blurb_txt = "This is a playground! Play around for a bit, and when you are ready to begin, hit next!";
    levels.push(level);

    s_levels_lvl = n_levels;
    //lvl? //learn offset
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_NONE;
    level.myC0_offset     = 0.458;       level.myC1_offset     = 0.5;
    level.myC0_wavelength = 0.5;       level.myC1_wavelength = 0.5;
    level.myC0_amplitude  = 0.5;       level.myC1_amplitude  = 0.5;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = false;
    level.myE0_toggle_enabled = false; level.myE1_toggle_enabled = false;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = false;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_NONE;
    level.gC0_offset      = 0.6;       level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 0.5;       level.gC1_wavelength  = 0.5;
    level.gC0_amplitude   = 0.5;       level.gC1_amplitude   = 0.5;
    level.allowed_wiggle_room = 120;
    level.playground = false;
    level.random = false;
    level.create = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    level.blurb = true;
    level.blurb_x = 210;
    level.blurb_y = 270;
    level.blurb_w = 400;
    level.blurb_h = 130;
    level.blurb_txt = "A snapshot of a wave can be defined by 3 properties- its Amplitude, Wavelength, and Offset. Alter the red wave's offset to match the green wave.";
    level.blurb_img = "offset";
    level.blurb_img_x = 250;
    level.blurb_img_y = 300;
    level.blurb_img_w = 100;
    level.blurb_img_h = 100;
    levels.push(level);

    //lvl? //learn wavelength
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_NONE;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 0.5;
    level.myC0_wavelength = 0.5;       level.myC1_wavelength = 0.5;
    level.myC0_amplitude  = 0.5;       level.myC1_amplitude  = 0.5;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = false;
    level.myE0_toggle_enabled = false; level.myE1_toggle_enabled = false;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = false;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_NONE;
    level.gC0_offset      = 0.5;       level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 0.3;       level.gC1_wavelength  = 0.5;
    level.gC0_amplitude   = 0.5;       level.gC1_amplitude   = 0.5;
    level.allowed_wiggle_room = 250;
    level.playground = false;
    level.random = false;
    level.create = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    level.blurb = true;
    level.blurb_x = 210;
    level.blurb_y = 270;
    level.blurb_w = 400;
    level.blurb_h = 130;
    level.blurb_txt = "A wave's Wavelength is the distance between each of its pulses. Again, use the sliders to match the green wave.";
    level.blurb_img = "wavelength";
    level.blurb_img_x = 250;
    level.blurb_img_y = 300;
    level.blurb_img_w = 100;
    level.blurb_img_h = 100;
    levels.push(level);

    //lvl? //learn amplitude (plus a bit of offset)
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_NONE;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 0.5;
    level.myC0_wavelength = 0.5;       level.myC1_wavelength = 0.5;
    level.myC0_amplitude  = 0.5;       level.myC1_amplitude  = 0.5;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = false;
    level.myE0_toggle_enabled = false; level.myE1_toggle_enabled = false;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = false;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_NONE;
    level.gC0_offset      = 0.55;      level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 0.5;       level.gC1_wavelength  = 0.5;
    level.gC0_amplitude   = 1.0;       level.gC1_amplitude   = 0.5;
    level.allowed_wiggle_room = 220;
    level.playground = false;
    level.random = false;
    level.create = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    level.blurb = true;
    level.blurb_x = 210;
    level.blurb_y = 270;
    level.blurb_w = 400;
    level.blurb_h = 130;
    level.blurb_txt = "Amplitude is the measurement of how far a wave deviates from its resting (non-oscillating) state (the horizontal line). You will need to move more than one slider to match this wave.";
    level.blurb_img = "amplitude";
    level.blurb_img_x = 250;
    level.blurb_img_y = 300;
    level.blurb_img_w = 100;
    level.blurb_img_h = 100;
    levels.push(level);

    //lvl? //try all three
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_NONE;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 0.5;
    level.myC0_wavelength = 0.5;       level.myC1_wavelength = 0.5;
    level.myC0_amplitude  = 0.5;       level.myC1_amplitude  = 0.5;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = false;
    level.myE0_toggle_enabled = false; level.myE1_toggle_enabled = false;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = false;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_NONE;
    level.gC0_offset      = 0.45;      level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 0.4;       level.gC1_wavelength  = 0.5;
    level.gC0_amplitude   = 0.8;       level.gC1_amplitude   = 0.5;
    level.allowed_wiggle_room = 250;
    level.playground = false;
    level.random = false;
    level.create = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    level.blurb = true;
    level.blurb_x = 210;
    level.blurb_y = 270;
    level.blurb_w = 400;
    level.blurb_h = 130;
    level.blurb_txt = "Alter the Amplitude, Wavelength, and Offset of the red wave to match the green.";
    levels.push(level);

    //lvl? //all three (low amp wave looks different)
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_NONE;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 0.5;
    level.myC0_wavelength = 0.5;       level.myC1_wavelength = 0.5;
    level.myC0_amplitude  = 0.5;       level.myC1_amplitude  = 0.5;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = false;
    level.myE0_toggle_enabled = false; level.myE1_toggle_enabled = false;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = false;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_NONE;
    level.gC0_offset      = 0.9;       level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 0.7;       level.gC1_wavelength  = 0.5;
    level.gC0_amplitude   = 0.2;       level.gC1_amplitude   = 0.5;
    level.allowed_wiggle_room = 70;
    level.playground = false;
    level.random = false;
    level.create = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    level.blurb = true;
    level.blurb_x = 210;
    level.blurb_y = 270;
    level.blurb_w = 400;
    level.blurb_h = 130;
    level.blurb_txt = "Waves can differ drastically from each other- you might say this wave has a \"small amplitude\" and a \"large wavelength\".";
    levels.push(level);

    //lvl? //zero amp wave
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_NONE;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 0.5;
    level.myC0_wavelength = 0.5;       level.myC1_wavelength = 0.5;
    level.myC0_amplitude  = 0.0;       level.myC1_amplitude  = 0.5;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = false;
    level.myE0_toggle_enabled = false; level.myE1_toggle_enabled = false;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = false;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_NONE;
    level.gC0_offset      = 0.3;       level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 0.5;       level.gC1_wavelength  = 0.5;
    level.gC0_amplitude   = 0.5;       level.gC1_amplitude   = 0.5;
    level.allowed_wiggle_room = 130;
    level.playground = false;
    level.random = false;
    level.create = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    level.blurb = true;
    level.blurb_x = 210;
    level.blurb_y = 270;
    level.blurb_w = 400;
    level.blurb_h = 130;
    level.blurb_txt = "If a wave has 0 amplitude, it can be represented simply as a flat line. With no amplitude, wavelength and offset are meaningless.";
    levels.push(level);

    //lvl? //*make* zero amp wave
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_NONE;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 0.5;
    level.myC0_wavelength = 0.5;       level.myC1_wavelength = 0.5;
    level.myC0_amplitude  = 0.5;       level.myC1_amplitude  = 0.5;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = false;
    level.myE0_toggle_enabled = false; level.myE1_toggle_enabled = false;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = false;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_NONE;
    level.gC0_offset      = 0.5;       level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 0.5;       level.gC1_wavelength  = 0.5;
    level.gC0_amplitude   = 0.0;       level.gC1_amplitude   = 0.5;
    level.allowed_wiggle_room = 130;
    level.playground = false;
    level.random = false;
    level.create = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    level.blurb = true;
    level.blurb_x = 210;
    level.blurb_y = 270;
    level.blurb_w = 400;
    level.blurb_h = 130;
    level.blurb_txt = "To eliminate this single wave, just decrease its amplitude.";
    levels.push(level);

    s_levels_last_lvl = n_levels;
    //lvl? //pulse
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_PULSE; level.myC1_type = COMP_TYPE_NONE;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 0.5;
    level.myC0_wavelength = 0.5;       level.myC1_wavelength = 0.5;
    level.myC0_amplitude  = 0.7;       level.myC1_amplitude  = 0.5;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = false;
    level.myE0_toggle_enabled = false; level.myE1_toggle_enabled = false;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = false;
    level.gC0_type = COMP_TYPE_PULSE;  level.gC1_type = COMP_TYPE_NONE;
    level.gC0_offset      = 0.7;       level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 0.3;       level.gC1_wavelength  = 0.5;
    level.gC0_amplitude   = 0.8;       level.gC1_amplitude   = 0.5;
    level.allowed_wiggle_room = 15;
    level.playground = false;
    level.random = false;
    level.create = false;
    level.return_to_menu = true;
    level.complete = default_completeness;
    level.blurb = true;
    level.blurb_x = 210;
    level.blurb_y = 270;
    level.blurb_w = 400;
    level.blurb_h = 130;
    level.blurb_txt = "A pulse is simply a single motion of a wave. Its Amplitude, Wavelength, and Offset can be considered in the very same way as the waves previous.";
    level.blurb_img = "pulse";
    level.blurb_img_x = 250;
    level.blurb_img_y = 300;
    level.blurb_img_w = 100;
    level.blurb_img_h = 100;
    levels.push(level);

    s_random_lvl = n_levels;
    //lvl? //single wave random
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_NONE;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 0.5;
    level.myC0_wavelength = 0.5;       level.myC1_wavelength = 0.5;
    level.myC0_amplitude  = 0.5;       level.myC1_amplitude  = 0.5;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = false;
    level.myE0_toggle_enabled = false; level.myE1_toggle_enabled = false;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = false;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_NONE;
    level.gC0_offset      = 0.5;       level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 0.5;       level.gC1_wavelength  = 0.5;
    level.gC0_amplitude   = 0.5;       level.gC1_amplitude   = 0.5;
    level.allowed_wiggle_room = 200;
    level.playground = false;
    level.random = 1;
    level.create = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    level.blurb = true;
    level.blurb_x = 210;
    level.blurb_y = 270;
    level.blurb_w = 400;
    level.blurb_h = 130;
    level.blurb_txt = "Complete as many random levels as you'd like, then return to menu.";
    levels.push(level);

    pl_play_lvl = n_levels;
    //lvl? //pulse playground
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_PULSE; level.myC1_type = COMP_TYPE_PULSE;
    level.myC0_offset     = 0.3;       level.myC1_offset     = 0.7;
    level.myC0_wavelength = 0.4;       level.myC1_wavelength = 0.3;
    level.myC0_amplitude  = 0.75;      level.myC1_amplitude  = 0.25;
    level.myE0_enabled = true;         level.myE1_enabled = true;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_NONE;   level.gC1_type = COMP_TYPE_NONE;
    level.gC0_offset      = 0.5;       level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 0.5;       level.gC1_wavelength  = 0.5;
    level.gC0_amplitude   = 0.5;       level.gC1_amplitude   = 0.5;
    level.allowed_wiggle_room = 500;
    level.playground = true;
    level.random = false;
    level.create = false;
    level.return_to_menu = true;
    level.complete = default_completeness;
    level.blurb = true;
    level.blurb_x = 210;
    level.blurb_y = 270;
    level.blurb_w = 400;
    level.blurb_h = 130;
    level.blurb_txt = "Here is a playground with two pulses. You can see what happens when you let the pulses overlap (this is known as wave interference). When you are ready to resume, hit next.";
    levels.push(level);

    pl_levels_lvl = n_levels;
    //lvl? //pulse constructive (change offset)
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_PULSE; level.myC1_type = COMP_TYPE_PULSE;
    level.myC0_offset     = 0.4;       level.myC1_offset     = 0.6;
    level.myC0_wavelength = 0.3;       level.myC1_wavelength = 0.4;
    level.myC0_amplitude  = 0.75;      level.myC1_amplitude  = 1.0;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_PULSE;  level.gC1_type = COMP_TYPE_PULSE;
    level.gC0_offset      = 0.6;       level.gC1_offset      = 0.6;
    level.gC0_wavelength  = 0.3;       level.gC1_wavelength  = 0.4;
    level.gC0_amplitude   = 0.75;      level.gC1_amplitude   = 1.0;
    level.allowed_wiggle_room = 15;
    level.playground = false;
    level.random = false;
    level.create = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    level.blurb = true;
    level.blurb_x = 210;
    level.blurb_y = 270;
    level.blurb_w = 400;
    level.blurb_h = 130;
    level.blurb_txt = "When two like pulses overlap, the result is the additive sum of each. This is called \"constructive interference\".";
    level.blurb_img = "constructive";
    level.blurb_img_x = 250;
    level.blurb_img_y = 300;
    level.blurb_img_w = 100;
    level.blurb_img_h = 100;
    levels.push(level);

    //lvl? //pulse destructive (change offset)
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_PULSE; level.myC1_type = COMP_TYPE_PULSE;
    level.myC0_offset     = 0.75;      level.myC1_offset     = 0.4;
    level.myC0_wavelength = 0.3;       level.myC1_wavelength = 0.8;
    level.myC0_amplitude  = 0.25;      level.myC1_amplitude  = 1.0;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_PULSE;  level.gC1_type = COMP_TYPE_PULSE;
    level.gC0_offset      = 0.4;       level.gC1_offset      = 0.4;
    level.gC0_wavelength  = 0.3;       level.gC1_wavelength  = 0.8;
    level.gC0_amplitude   = 0.25;      level.gC1_amplitude   = 1.0;
    level.allowed_wiggle_room = 15;
    level.playground = false;
    level.random = false;
    level.create = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    level.blurb = true;
    level.blurb_x = 210;
    level.blurb_y = 270;
    level.blurb_w = 400;
    level.blurb_h = 130;
    level.blurb_txt = "When two pulses on different sides of the line overlap, the result is one pulse subtracted from the other. This is known as \"destructive interference\".";
    level.blurb_img = "destructive";
    level.blurb_img_x = 250;
    level.blurb_img_y = 300;
    level.blurb_img_w = 100;
    level.blurb_img_h = 100;
    levels.push(level);

    //lvl? //pulse bottoms out
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_PULSE; level.myC1_type = COMP_TYPE_PULSE;
    level.myC0_offset     = 0.2;       level.myC1_offset     = 0.44;
    level.myC0_wavelength = 0.55;      level.myC1_wavelength = 0.29;
    level.myC0_amplitude  = 0.75;      level.myC1_amplitude  = 0.0;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_PULSE;  level.gC1_type = COMP_TYPE_PULSE;
    level.gC0_offset      = 0.48;      level.gC1_offset      = 0.44;
    level.gC0_wavelength  = 0.55;      level.gC1_wavelength  = 0.29;
    level.gC0_amplitude   = 0.75;      level.gC1_amplitude   = 0.0;
    level.allowed_wiggle_room = 15;
    level.playground = false;
    level.random = false;
    level.create = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    level.blurb = true;
    level.blurb_x = 210;
    level.blurb_y = 270;
    level.blurb_w = 400;
    level.blurb_h = 130;
    level.blurb_txt = "Combining very different pulses can yield interesting results.";
    levels.push(level);

    //lvl? //pulse double amplitude (by changing wavelength
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_PULSE; level.myC1_type = COMP_TYPE_PULSE;
    level.myC0_offset     = 0.6;       level.myC1_offset     = 0.6;
    level.myC0_wavelength = 0.2;       level.myC1_wavelength = 0.6;
    level.myC0_amplitude  = 0.75;      level.myC1_amplitude  = 0.75;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_PULSE;  level.gC1_type = COMP_TYPE_PULSE;
    level.gC0_offset      = 0.6;       level.gC1_offset      = 0.6;
    level.gC0_wavelength  = 0.6;       level.gC1_wavelength  = 0.6;
    level.gC0_amplitude   = 0.75;      level.gC1_amplitude   = 0.75;
    level.allowed_wiggle_room = 15;
    level.playground = false;
    level.random = false;
    level.create = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    level.blurb = true;
    level.blurb_x = 210;
    level.blurb_y = 270;
    level.blurb_w = 400;
    level.blurb_h = 130;
    level.blurb_txt = "If two waves with identical Amplitude, Wavelength, and Offset are interfering, the result will be a pulse exactly double in Amplitude of either.";
    levels.push(level);

    //lvl? //pulse total destruction
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_PULSE; level.myC1_type = COMP_TYPE_PULSE;
    level.myC0_offset     = 0.7;       level.myC1_offset     = 0.4;
    level.myC0_wavelength = 0.4;       level.myC1_wavelength = 0.5;
    level.myC0_amplitude  = 0.65;      level.myC1_amplitude  = 0.25;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_PULSE;  level.gC1_type = COMP_TYPE_PULSE;
    level.gC0_offset      = 0.4;       level.gC1_offset      = 0.4;
    level.gC0_wavelength  = 0.5;       level.gC1_wavelength  = 0.5;
    level.gC0_amplitude   = 0.75;      level.gC1_amplitude   = 0.25;
    level.allowed_wiggle_room = 15;
    level.playground = false;
    level.random = false;
    level.create = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    level.blurb = true;
    level.blurb_x = 210;
    level.blurb_y = 270;
    level.blurb_w = 400;
    level.blurb_h = 130;
    level.blurb_txt = "If two waves with identical Wavelength and Offset are interfering, but have opposite Amplitudes, the resulting wave can be said to be \"cancelled out\".";
    level.blurb_img = "cancel";
    level.blurb_img_x = 250;
    level.blurb_img_y = 300;
    level.blurb_img_w = 100;
    level.blurb_img_h = 100;
    levels.push(level);

    pl_levels_last_lvl = n_levels;
    //lvl? //pulse weird offset
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_PULSE; level.myC1_type = COMP_TYPE_PULSE;
    level.myC0_offset     = 0.2;       level.myC1_offset     = 0.76;
    level.myC0_wavelength = 0.6;       level.myC1_wavelength = 0.7;
    level.myC0_amplitude  = 0.2;       level.myC1_amplitude  = 0.3;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_PULSE;  level.gC1_type = COMP_TYPE_PULSE;
    level.gC0_offset      = 0.5;       level.gC1_offset      = 0.76;
    level.gC0_wavelength  = 0.7;       level.gC1_wavelength  = 0.7;
    level.gC0_amplitude   = 0.7;       level.gC1_amplitude   = 0.3;
    level.allowed_wiggle_room = 30;
    level.playground = false;
    level.random = false;
    level.create = false;
    level.return_to_menu = true;
    level.complete = default_completeness;
    level.blurb = true;
    level.blurb_x = 210;
    level.blurb_y = 270;
    level.blurb_w = 400;
    level.blurb_h = 130;
    level.blurb_txt = "Alter the Amplitude, Wavelength, and Offset of the red wave to interfere with the blue wave so that they overlap just enough to greate the green wave.";
    levels.push(level);

    pl_random_lvl = n_levels;
    //lvl? //pulse random
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_PULSE; level.myC1_type = COMP_TYPE_PULSE;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 0.5;
    level.myC0_wavelength = 0.5;       level.myC1_wavelength = 0.5;
    level.myC0_amplitude  = 0.5;       level.myC1_amplitude  = 0.5;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_PULSE;  level.gC1_type = COMP_TYPE_PULSE;
    level.gC0_offset      = 0.5;       level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 0.5;       level.gC1_wavelength  = 0.5;
    level.gC0_amplitude   = 0.5;       level.gC1_amplitude   = 0.5;
    level.allowed_wiggle_room = 20;
    level.playground = false;
    level.random = 2;
    level.create = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    levels.push(level);

    dl_play_lvl = n_levels;
    ds_play_lvl = n_levels;
    d_play_lvl = n_levels;
    //lvl? //double wave playground
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_SIN;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 1.0;
    level.myC0_wavelength = 0.35;      level.myC1_wavelength = 1.0;
    level.myC0_amplitude  = 0.5;       level.myC1_amplitude  = 1.0;
    level.myE0_enabled = true;         level.myE1_enabled = true;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_NONE;   level.gC1_type = COMP_TYPE_NONE;
    level.gC0_offset      = 0.5;       level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 0.5;       level.gC1_wavelength  = 0.5;
    level.gC0_amplitude   = 0.5;       level.gC1_amplitude   = 0.5;
    level.allowed_wiggle_room = 500;
    level.playground = true;
    level.random = false;
    level.create = false;
    level.return_to_menu = true;
    level.complete = default_completeness;
    level.blurb = true;
    level.blurb_x = 210;
    level.blurb_y = 270;
    level.blurb_w = 400;
    level.blurb_h = 130;
    level.blurb_txt = "This is a playground with two interfering waves. All the rules of interference that applied to pulses apply equally to waves. When you are done experimenting, hit next to resume.";
    levels.push(level);

    dl_levels_lvl = n_levels;
    //lvl? //offset of high freq
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_SIN;
    level.myC0_offset     = 0.44;      level.myC1_offset     = 1.0;
    level.myC0_wavelength = 0.3;       level.myC1_wavelength = 1.0;
    level.myC0_amplitude  = 0.5;       level.myC1_amplitude  = 1.0;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_SIN;
    level.gC0_offset      = 0.5;       level.gC1_offset      = 1.0;
    level.gC0_wavelength  = 0.3;       level.gC1_wavelength  = 1.0;
    level.gC0_amplitude   = 0.5;       level.gC1_amplitude   = 1.0;
    level.allowed_wiggle_room = 250;
    level.playground = false;
    level.random = false;
    level.create = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    level.blurb = true;
    level.blurb_x = 210;
    level.blurb_y = 270;
    level.blurb_w = 400;
    level.blurb_h = 130;
    level.blurb_txt = "When you have a wave with a large wavelength overlapping (interfering with) a wave with a small wavelength, the alternating constructive and destructive interference looks like the smaller wave \"riding\" the larger one.";
    level.blurb_img = "highlowfq";
    level.blurb_img_x = 250;
    level.blurb_img_y = 300;
    level.blurb_img_w = 100;
    level.blurb_img_h = 100;
    levels.push(level);

    //lvl? //offset of low freq
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_SIN;
    level.myC0_offset     = 0.3;       level.myC1_offset     = 0.5;
    level.myC0_wavelength = 1.0;       level.myC1_wavelength = 0.3;
    level.myC0_amplitude  = 1.0;       level.myC1_amplitude  = 0.5;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_SIN;
    level.gC0_offset      = 0.65;      level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 1.0;       level.gC1_wavelength  = 0.3;
    level.gC0_amplitude   = 1.0;       level.gC1_amplitude   = 0.5;
    level.allowed_wiggle_room = 220;
    level.playground = false;
    level.random = false;
    level.create = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    level.blurb = true;
    level.blurb_x = 210;
    level.blurb_y = 270;
    level.blurb_w = 400;
    level.blurb_h = 130;
    level.blurb_txt = "Try hitting the \"play\" button on the large wave to watch how its offset effects the resulting wave.";
    levels.push(level);

    //lvl? //wavelength of high freq
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_SIN;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 0.5;
    level.myC0_wavelength = 0.5;       level.myC1_wavelength = 1.0;
    level.myC0_amplitude  = 0.5;       level.myC1_amplitude  = 1.0;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_SIN;
    level.gC0_offset      = 0.5;       level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 0.3;       level.gC1_wavelength  = 1.0;
    level.gC0_amplitude   = 0.5;       level.gC1_amplitude   = 1.0;
    level.allowed_wiggle_room = 250;
    level.playground = false;
    level.random = false;
    level.create = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    level.blurb = true;
    level.blurb_x = 210;
    level.blurb_y = 270;
    level.blurb_w = 400;
    level.blurb_h = 130;
    level.blurb_txt = "The Wavelength of the smaller wave dictates the width of the little squiggles, and the Wavelength of the larger wave dictates the width of the big squiggles. (\"Squiggles\" is not a technical term, but it probably should be.)";
    levels.push(level);

    //lvl? //wavelength of low freq
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_SIN;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 0.5;
    level.myC0_wavelength = 0.5;       level.myC1_wavelength = 0.3;
    level.myC0_amplitude  = 1.0;       level.myC1_amplitude  = 0.5;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_SIN;
    level.gC0_offset      = 0.5;       level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 0.9;       level.gC1_wavelength  = 0.3;
    level.gC0_amplitude   = 1.0;       level.gC1_amplitude   = 0.5;
    level.allowed_wiggle_room = 200;
    level.playground = false;
    level.random = false;
    level.create = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    level.blurb = true;
    level.blurb_x = 210;
    level.blurb_y = 270;
    level.blurb_w = 400;
    level.blurb_h = 130;
    level.blurb_txt = "If this wave looks intimidating, just try to mentally break the green wave down into two- one for its little squiggles, and one for its big squiggles. Then create that.";
    levels.push(level);

    //lvl? //zero amp high freq
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_SIN;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 0.3;
    level.myC0_wavelength = 0.45;      level.myC1_wavelength = 1.0;
    level.myC0_amplitude  = 0.0;       level.myC1_amplitude  = 1.0;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_SIN;
    level.gC0_offset      = 0.6;       level.gC1_offset      = 0.3;
    level.gC0_wavelength  = 0.45;      level.gC1_wavelength  = 1.0;
    level.gC0_amplitude   = 0.5;       level.gC1_amplitude   = 1.0;
    level.allowed_wiggle_room = 150;
    level.playground = false;
    level.random = false;
    level.create = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    level.blurb = true;
    level.blurb_x = 210;
    level.blurb_y = 270;
    level.blurb_w = 400;
    level.blurb_h = 130;
    level.blurb_txt = "When there is only one wave, zero Amplitude means a flat line. When there are two, if either of the waves are flat, that wave will simply not effect (interfere with) the other.";
    levels.push(level);

    //lvl? //zero amp low freq
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_SIN;
    level.myC0_offset     = 0.0;       level.myC1_offset     = 0.3;
    level.myC0_wavelength = 1.0;       level.myC1_wavelength = 0.2;
    level.myC0_amplitude  = 0.0;       level.myC1_amplitude  = 0.5;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_SIN;
    level.gC0_offset      = 0.55;      level.gC1_offset      = 0.3;
    level.gC0_wavelength  = 1.0;       level.gC1_wavelength  = 0.2;
    level.gC0_amplitude   = 1.0;       level.gC1_amplitude   = 0.5;
    level.allowed_wiggle_room = 160;
    level.playground = false;
    level.random = false;
    level.create = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    level.blurb = true;
    level.blurb_x = 210;
    level.blurb_y = 270;
    level.blurb_w = 400;
    level.blurb_h = 130;
    level.blurb_txt = "Turn on the \"wave visualization\" to show how increasing the large wave's amplitude effects the result.";
    levels.push(level);

    //lvl? //all three- low freq
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_SIN;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 0.5;
    level.myC0_wavelength = 1.0;       level.myC1_wavelength = 0.2;
    level.myC0_amplitude  = 1.0;       level.myC1_amplitude  = 0.6;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_SIN;
    level.gC0_offset      = 0.4;       level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 0.8;       level.gC1_wavelength  = 0.2;
    level.gC0_amplitude   = 0.5;       level.gC1_amplitude   = 0.6;
    level.allowed_wiggle_room = 210;
    level.playground = false;
    level.random = false;
    level.create = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    level.blurb = true;
    level.blurb_x = 210;
    level.blurb_y = 270;
    level.blurb_w = 400;
    level.blurb_h = 130;
    level.blurb_txt = "For this wave, you will need to alter the Amplitude, Wavelength, and Frequency to create the correct interference.";
    levels.push(level);

    //lvl? //total interference- low freq
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_SIN;
    level.myC0_offset     = 0.0;       level.myC1_offset     = 1.0;
    level.myC0_wavelength = 1.0;       level.myC1_wavelength = 1.0;
    level.myC0_amplitude  = 1.0;       level.myC1_amplitude  = 1.0;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_SIN;
    level.gC0_offset      = 0.5;       level.gC1_offset      = 1.0;
    level.gC0_wavelength  = 1.0;       level.gC1_wavelength  = 1.0;
    level.gC0_amplitude   = 1.0;       level.gC1_amplitude   = 1.0;
    level.allowed_wiggle_room = 110;
    level.playground = false;
    level.random = false;
    level.create = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    level.blurb = true;
    level.blurb_x = 210;
    level.blurb_y = 270;
    level.blurb_w = 400;
    level.blurb_h = 130;
    level.blurb_txt = "Like pulses, if two waves are identical except for their opposite amplitude, they can cancel each other out. (Click the wave visualizer to see this in action).";
    levels.push(level);

    //lvl? //total interference- med freq
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_SIN;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 0.5;
    level.myC0_wavelength = 0.5;       level.myC1_wavelength = 0.5;
    level.myC0_amplitude  = 0.5;       level.myC1_amplitude  = 0.5;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_SIN;
    level.gC0_offset      = 0.63;      level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 0.5;       level.gC1_wavelength  = 0.5;
    level.gC0_amplitude   = 0.5;       level.gC1_amplitude   = 0.5;
    level.allowed_wiggle_room = 110;
    level.playground = false;
    level.random = false;
    level.create = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    level.blurb = true;
    level.blurb_x = 210;
    level.blurb_y = 270;
    level.blurb_w = 400;
    level.blurb_h = 130;
    level.blurb_txt = "Waves of any shape or size can be cancelled out, so long as the wave interfering with them has the opposite amplitude.";
    levels.push(level);

    dl_levels_last_lvl = n_levels;
    //lvl? //total interference- wavelength
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_SIN;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 0.76;
    level.myC0_wavelength = 0.5;       level.myC1_wavelength = 0.7;
    level.myC0_amplitude  = 0.5;       level.myC1_amplitude  = 0.5;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_SIN;
    level.gC0_offset      = 0.5;       level.gC1_offset      = 0.76;
    level.gC0_wavelength  = 0.7;       level.gC1_wavelength  = 0.7;
    level.gC0_amplitude   = 0.5;       level.gC1_amplitude   = 0.5;
    level.allowed_wiggle_room = 110;
    level.playground = false;
    level.random = false;
    level.create = false;
    level.return_to_menu = true;
    level.complete = default_completeness;
    level.blurb = true;
    level.blurb_x = 210;
    level.blurb_y = 270;
    level.blurb_w = 400;
    level.blurb_h = 130;
    level.blurb_txt = "If the starting wave looks intimidating, just try to imagine what the red wave would need to look like to cancel out the blue. (The wave visualization might help here.)";
    levels.push(level);

    dl_random_lvl = n_levels;
    //lvl? //double-locked wave random
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_SIN;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 0.5;
    level.myC0_wavelength = 0.5;       level.myC1_wavelength = 0.5;
    level.myC0_amplitude  = 0.5;       level.myC1_amplitude  = 0.5;
    level.myE0_enabled = true;         level.myE1_enabled = false;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_SIN;
    level.gC0_offset      = 0.5;       level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 0.5;       level.gC1_wavelength  = 0.5;
    level.gC0_amplitude   = 0.5;       level.gC1_amplitude   = 0.5;
    level.allowed_wiggle_room = 300;
    level.playground = false;
    level.random = 3;
    level.create = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    levels.push(level);

    ds_levels_lvl = n_levels;
    //lvl? //offset change- reach for correct slider (high freq)
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_SIN;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 0.9;
    level.myC0_wavelength = 1.0;       level.myC1_wavelength = 0.3;
    level.myC0_amplitude  = 1.0;       level.myC1_amplitude  = 0.5;
    level.myE0_enabled = true;         level.myE1_enabled = true;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_SIN;
    level.gC0_offset      = 0.5;       level.gC1_offset      = 0.3;
    level.gC0_wavelength  = 1.0;       level.gC1_wavelength  = 0.3;
    level.gC0_amplitude   = 1.0;       level.gC1_amplitude   = 0.5;
    level.allowed_wiggle_room = 300;
    level.playground = false;
    level.random = false;
    level.create = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    level.blurb = true;
    level.blurb_x = 210;
    level.blurb_y = 270;
    level.blurb_w = 400;
    level.blurb_h = 130;
    level.blurb_txt = "Now you can edit either wave. Take a look at the green wave, then the purple wave. Think which wave (the blue or the red) will you need to alter to create the green?";
    levels.push(level);

    ds_levels_last_lvl = n_levels;
    //lvl? //offset change- reach for correct slider (low freq)
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_SIN;
    level.myC0_offset     = 0.2;       level.myC1_offset     = 0.5;
    level.myC0_wavelength = 1.0;       level.myC1_wavelength = 0.2;
    level.myC0_amplitude  = 1.0;       level.myC1_amplitude  = 0.5;
    level.myE0_enabled = true;         level.myE1_enabled = true;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_SIN;
    level.gC0_offset      = 0.6;       level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 1.0;       level.gC1_wavelength  = 0.2;
    level.gC0_amplitude   = 1.0;       level.gC1_amplitude   = 0.5;
    level.allowed_wiggle_room = 200;
    level.playground = false;
    level.random = false;
    level.create = false;
    level.return_to_menu = true;
    level.complete = default_completeness;
    level.blurb = true;
    level.blurb_x = 210;
    level.blurb_y = 270;
    level.blurb_w = 400;
    level.blurb_h = 130;
    level.blurb_txt = "If you can, try to guess what change you will need to make to solve this before touching any of the sliders. Then move the one slider to solve this wave.";
    levels.push(level);

    ds_random_lvl = n_levels;
    //lvl? //double-single wave random
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_SIN;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 0.5;
    level.myC0_wavelength = 0.5;       level.myC1_wavelength = 0.5;
    level.myC0_amplitude  = 0.5;       level.myC1_amplitude  = 0.5;
    level.myE0_enabled = true;         level.myE1_enabled = true;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_SIN;
    level.gC0_offset      = 0.5;       level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 0.5;       level.gC1_wavelength  = 0.5;
    level.gC0_amplitude   = 0.5;       level.gC1_amplitude   = 0.5;
    level.allowed_wiggle_room = 300;
    level.playground = false;
    level.random = 4;
    level.create = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    levels.push(level);

    d_levels_lvl = n_levels;
    d_levels_last_lvl = n_levels;
    //lvl? //start at 0
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;       level.myC1_type = COMP_TYPE_SIN;
    level.myC0_offset     = 0.0;           level.myC1_offset     = 0.0;
    level.myC0_wavelength = 0.0;           level.myC1_wavelength = 0.0;
    level.myC0_amplitude  = 0.0;           level.myC1_amplitude  = 0.0;
    level.myE0_enabled = true;             level.myE1_enabled = true;
    level.myE0_visible = true;             level.myE1_visible = true;
    level.myE0_toggle_enabled = true;      level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;      level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_SIN;        level.gC1_type = COMP_TYPE_SIN;
    level.gC0_offset      = 0.5;           level.gC1_offset      = 1.0;
    level.gC0_wavelength  = 0.25;          level.gC1_wavelength  = 1.0;
    level.gC0_amplitude   = 0.5;           level.gC1_amplitude   = 1.0;
    level.allowed_wiggle_room = 500;
    level.playground = false;
    level.random = false;
    level.create = false;
    level.return_to_menu = true;
    level.complete = default_completeness;
    level.blurb = true;
    level.blurb_x = 210;
    level.blurb_y = 270;
    level.blurb_w = 400;
    level.blurb_h = 130;
    level.blurb_txt = "You've seen this green wave before. Edit both waves to construct a solution.";
    levels.push(level);

    d_random_lvl = n_levels;
    //lvl? //double wave random
    n_levels++;
    level = new Level();
    level.myC0_type = COMP_TYPE_SIN;   level.myC1_type = COMP_TYPE_SIN;
    level.myC0_offset     = 0.5;       level.myC1_offset     = 0.5;
    level.myC0_wavelength = 0.5;       level.myC1_wavelength = 0.5;
    level.myC0_amplitude  = 0.5;       level.myC1_amplitude  = 0.5;
    level.myE0_enabled = true;         level.myE1_enabled = true;
    level.myE0_visible = true;         level.myE1_visible = true;
    level.myE0_toggle_enabled = true;  level.myE1_toggle_enabled = true;
    level.myE0_toggle_default = true;  level.myE1_toggle_default = true;
    level.gC0_type = COMP_TYPE_SIN;    level.gC1_type = COMP_TYPE_SIN;
    level.gC0_offset      = 0.5;       level.gC1_offset      = 0.5;
    level.gC0_wavelength  = 0.5;       level.gC1_wavelength  = 0.5;
    level.gC0_amplitude   = 0.5;       level.gC1_amplitude   = 0.5;
    level.allowed_wiggle_room = 400;
    level.playground = false;
    level.random = 5;
    level.create = false;
    level.return_to_menu = false;
    level.complete = default_completeness;
    levels.push(level);

    placer_clicker = new Clicker({source:stage.dispCanv.canvas});
    placer_dragger = new Dragger({source:stage.dispCanv.canvas});
    menu_clicker = new Clicker({source:stage.dispCanv.canvas});
    blurb_clicker = new Clicker({source:stage.dispCanv.canvas});
    play_dragger = new Dragger({source:stage.dispCanv.canvas});
    play_presser = new Presser({source:stage.dispCanv.canvas});
    play_clicker = new Clicker({source:stage.dispCanv.canvas});

    clip = new ClipBoard(20,20,self.c.width-40,self.c.height-20,self,levels);

    e0AnimDisplay = new CompositionAnimationDrawer(myC0,  nullC, myE0.x+10, myE0.y+10, myE0.w-20, (myE0.h/2)-10);
    e1AnimDisplay = new CompositionAnimationDrawer(nullC, myC1,  myE1.x+10, myE1.y+10, myE1.w-20, (myE1.h/2)-10);
    myAnimDisplay = new CompositionAnimationDrawer(myC0,  myC1,  10, 10, self.c.width-20, (self.c.height-20)/2);

    gC0 = new Component(COMP_TYPE_SIN, 1, graph_default_offset, graph_default_wavelength, graph_default_amplitude);
    gC1 = new Component(COMP_TYPE_NONE, -1, graph_default_offset, graph_default_wavelength, graph_default_amplitude);
    gComp = new Composition(gC0, gC1);
    gDisplay = new GraphDrawer(gComp, 10, 10, self.c.width-20, ((self.c.height-20)/2));
    gDisplay.draw_zero_x = false;
    gDisplay.draw_zero_y = true;
    gDisplay.lineWidth = 8;
    gDisplay.color = "#88FF88";
    gDisplay.dotted = false;
    g2Display = new GraphDrawer(gComp, 10, 10, self.c.width-20, ((self.c.height-20)/2));
    g2Display.draw_zero_x = false;
    g2Display.draw_zero_y = false;
    g2Display.lineWidth = 2;
    g2Display.color = "#FFFFFF";
    g2Display.dotted = false;

    blurb = new Blurb(self);

    menuButton  = new ButtonBox(10, 10, 80, 20, function(on) { self.setMode(GAME_MODE_MENU); });

    readyButton = new ButtonBox(self.c.width-10-80, 10, 80, 20,
      function(on)
      {
        if( //if this is showing
          levels[cur_level].playground ||
          (
            validator.delta < levels[cur_level].allowed_wiggle_room &&
            myE0.goal_contribution == 1 &&
            myE1.goal_contribution == 1 &&
            !myC0.playing && !myC1.playing
          )
        )
        {
          levels[cur_level].complete++;

          if(levels[cur_level].return_to_menu) self.setMode(GAME_MODE_MENU);
          else
          {
            if(!levels[cur_level].random) cur_level = (cur_level+1)%n_levels;
            self.populateWithLevel(levels[cur_level]);
            self.popBlurb();
          }
        }
      }
    );
    skipButton = new ButtonBox(self.c.width-10-80, 50, 80, 20,
      function(on)
      {
        if( //if this is showing
          levels[cur_level].random ||
          (
            !levels[cur_level].playground &&
            levels[cur_level].complete
          )
        )
        {
          if(levels[cur_level].return_to_menu) self.setMode(GAME_MODE_MENU);
          else
          {
            if(!levels[cur_level].random) cur_level = (cur_level+1)%n_levels;
            self.populateWithLevel(levels[cur_level]);
            self.popBlurb();
          }
        }
      }
    );
    if(print_debug)
      printButton = new ButtonBox(self.c.width-10-80, 90, 80, 20, function(on) { self.print(); });

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

      canv.context.fillStyle = "#000000";
      canv.context.save();
      canv.context.translate(this.x, this.y);
      canv.context.rotate(Math.PI/2);
      canv.context.fillText("show wave contributions", 20, -20);
      canv.context.restore();
    }

    validator = new Validator(myComp, gComp);
    vDrawer = new ValidatorDrawer(10, 10+((self.c.height-20)/2)-20, self.c.width-20, 20, validator);

    if(placer_debug)
    {
      placer_clicker.register(placer);
      placer_dragger.register(placer);
    }
    clip.register(menu_clicker);
    blurb_clicker.register(blurb);

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


    self.setMode(GAME_MODE_MENU);
  };

  self.requestLevel = function(lvl)
  {
    cur_level = lvl;
    self.populateWithLevel(levels[cur_level]);
    self.setMode(GAME_MODE_PLAY);
    self.popBlurb();
  }

  self.popBlurb = function()
  {
    if(levels[cur_level].blurb && !levels[cur_level].blurb_seen)
    {
      var curl = levels[cur_level];
      blurb.x = curl.blurb_x;
      blurb.y = curl.blurb_y;
      blurb.w = curl.blurb_w;
      blurb.h = curl.blurb_h;
      blurb.txt = curl.blurb_txt;
      if(curl.blurb_txt_x || curl.blurb_txt_y || curl.blurb_txt_w || curl.blurb_txt_h) //if any properties set on blurb text pos
      {
        blurb.txt_x = curl.blurb_txt_x;
        blurb.txt_y = curl.blurb_txt_y;
        blurb.txt_w = curl.blurb_txt_w;
        blurb.txt_h = curl.blurb_txt_h;
      }
      else //otherwise assume full text area
      {
        blurb.txt_x = curl.blurb_x+10;
        blurb.txt_y = curl.blurb_y+15;
        blurb.txt_w = curl.blurb_w-10;
        blurb.txt_h = curl.blurb_h-30;
      }
      blurb.img = curl.blurb_img;
      blurb.img_x = curl.blurb_img_x;
      blurb.img_y = curl.blurb_img_y;
      blurb.img_w = curl.blurb_img_w;
      blurb.img_h = curl.blurb_img_h;
      blurb.format(stage.drawCanv);
      self.setMode(GAME_MODE_BLURB);
      levels[cur_level].blurb_seen = true;
    }
  }

  self.populateWithLevel = function(level)
  {
    myC0.type = level.myC0_type;
    myC1.type = level.myC1_type;
    myE0.setDefaults(level.myC0_offset, level.myC0_wavelength, level.myC0_amplitude);
    myE1.setDefaults(level.myC1_offset, level.myC1_wavelength, level.myC1_amplitude);
    myE0.enabled = level.myE0_enabled;
    myE0.visible = level.myE0_visible;
    myE0.toggle_enabled = level.myE0_toggle_enabled;
    myE0.toggle_default = level.myE0_toggle_default; myE0.toggle_button.set(level.myE0_toggle_default);
    if(myE0.toggle_default) myE0.component.contribution = 1;
    else                    myE0.component.contribution = 0;
    myE0.play_button.set(true);
    myE1.enabled = level.myE1_enabled;
    myE1.visible = level.myE1_visible;
    myE1.toggle_enabled = level.myE1_toggle_enabled;
    myE1.toggle_default = level.myE1_toggle_default; myE1.toggle_button.set(level.myE1_toggle_default);
    if(myE1.toggle_default) myE1.component.contribution = 1;
    else                    myE1.component.contribution = 0;
    myE1.play_button.set(true);

    gC0.set(level.gC0_type,  1, level.gC0_offset, level.gC0_wavelength, level.gC0_amplitude);
    gC1.set(level.gC1_type, -1, level.gC1_offset, level.gC1_wavelength, level.gC1_amplitude);

    if(level.playground) level.complete = true;
    var a;
    var w;
    var o;
    switch(level.random)
    {
      case 1: //single wave
        myE0.setDefaults(Math.random(), Math.random(), Math.random());
        gC0.set(COMP_TYPE_SIN, 1, Math.random(), Math.random(), Math.random());
        break;
      case 2: //pulse interference
        myE0.setDefaults(Math.random(), Math.random(), Math.random());
        gC0.set(COMP_TYPE_PULSE, 1, Math.random(), Math.random(), Math.random());
        a = Math.random();
        w = Math.random();
        o = Math.random();
        myE1.setDefaults(a, w, o);
        gC1.set(COMP_TYPE_PULSE, 1, a, w, o);
        break;
      case 3: //wave interference (locked)
        myE0.setDefaults(Math.random(), Math.random(), Math.random());
        gC0.set(COMP_TYPE_SIN, 1, Math.random(), Math.random(), Math.random());
        a = Math.random();
        w = Math.random();
        o = Math.random();
        myE1.setDefaults(a, w, o);
        gC1.set(COMP_TYPE_SIN, 1, a, w, o);
        break;
      case 4: //wave interference (only change one)
        if(Math.random() < .5)
        {
          myE0.setDefaults(Math.random(), Math.random(), Math.random());
          gC0.set(COMP_TYPE_SIN, 1, Math.random(), Math.random(), Math.random());
          a = Math.random();
          w = Math.random();
          o = Math.random();
          myE1.setDefaults(a, w, o);
          gC1.set(COMP_TYPE_SIN, 1, a, w, o);
        }
        else
        {
          myE1.setDefaults(Math.random(), Math.random(), Math.random());
          gC1.set(COMP_TYPE_SIN, 1, Math.random(), Math.random(), Math.random());
          a = Math.random();
          w = Math.random();
          o = Math.random();
          myE0.setDefaults(a, w, o);
          gC0.set(COMP_TYPE_SIN, 1, a, w, o);
        }
        break;
      case 5: //wave interference (all's fair)
          myE1.setDefaults(Math.random(), Math.random(), Math.random());
          gC1.set(COMP_TYPE_SIN, 1, Math.random(), Math.random(), Math.random());
          myE0.setDefaults(Math.random(), Math.random(), Math.random());
          gC0.set(COMP_TYPE_SIN, 1, Math.random(), Math.random(), Math.random());
        break;
      default: break; //nothin!
    }

    myE0.hardReset();
    myE1.hardReset();

    myC0.dirty();
    myC1.dirty();

    validator.dirty();

    e0AnimDisplay.progress = 0; e0AnimDisplay.intended_progress = 0;
    e1AnimDisplay.progress = 0; e1AnimDisplay.intended_progress = 0;
    myAnimDisplay.progress = 0; myAnimDisplay.intended_progress = 0;
  }

  self.print = function()
  {
    dbugger.log(validator.delta);
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
    menu_clicker.ignore();
    play_dragger.ignore();
    play_presser.ignore();
    play_clicker.ignore();
    blurb_clicker.ignore();

    game_mode = mode;

    clip.dirty();
    if(game_mode == GAME_MODE_MENU)
      clip.desired_y = 20;
    else if(game_mode == GAME_MODE_PLAY)
      clip.desired_y = 500;
  }

  var t = 0;
  self.tick = function()
  {
    if(placer_debug)
    {
      placer_clicker.flush();
      placer_dragger.flush();
    }
    if(game_mode == GAME_MODE_MENU)
    {
      menu_clicker.flush();
    }
    else if(game_mode == GAME_MODE_PLAY)
    {
      play_dragger.flush();
      play_presser.flush();
      play_clicker.flush();
    }
    else if(game_mode == GAME_MODE_BLURB)
    {
      blurb_clicker.flush();
    }

    clip.tick();
    myE0.tick();
    myE1.tick();
    myC0.tick();
    myC1.tick();

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
    if(t > 4*Math.PI) t-=4*Math.PI;
  };

  self.draw = function()
  {
    if(!levels[cur_level].playground)
    {
      //pulsing goal
      self.dc.context.globalAlpha = 1-(Math.pow(((Math.sin(t*2)+1)/2),2)/2);
      gDisplay.draw(self.dc);
      g2Display.draw(self.dc);
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

    if(levels[cur_level].playground || (validator.delta < levels[cur_level].allowed_wiggle_room && myE0.goal_contribution == 1 && myE1.goal_contribution == 1 && !myC0.playing && !myC1.playing))
    {
      readyButton.draw(self.dc); readyButton.draw(self.dc); self.dc.context.fillStyle = "#000000"; self.dc.context.fillText("next",readyButton.x+10,readyButton.y+15);
    }
    //if(!levels[cur_level].playground)
      //vDrawer.draw(levels[cur_level].allowed_wiggle_room, self.dc);

    menuButton.draw(self.dc); self.dc.context.fillStyle = "#000000"; self.dc.context.fillText("menu",menuButton.x+10,menuButton.y+15);
    if(!levels[cur_level].playground && (levels[cur_level].complete || levels[cur_level].random))
    {
      skipButton.draw(self.dc); self.dc.context.fillStyle = "#000000";
      if(levels[cur_level].random)
        self.dc.context.fillText("re-roll",skipButton.x+10,skipButton.y+15);
      else
        self.dc.context.fillText("skip",skipButton.x+10,skipButton.y+15);
    }
    if(print_debug)
      printButton.draw(self.dc);

    if(levels[cur_level].myE1_visible)
      composeButton.draw(self.dc);

    clip.draw(self.dc);

    if(game_mode == GAME_MODE_BLURB)
      blurb.draw(self.dc);

    if(placer_debug)
    {
      placer.draw(self.dc);
    }

    clip.cleanse();
    myComp.cleanse();
    myDisplay.cleanse();
    gComp.cleanse();
    gDisplay.cleanse();
    g2Display.cleanse();
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

