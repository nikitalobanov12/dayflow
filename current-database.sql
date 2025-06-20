-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.boards (
  id bigint NOT NULL DEFAULT nextval('boards_id_seq'::regclass),
  name text NOT NULL,
  description text,
  color text,
  created_at timestamp with time zone DEFAULT now(),
  user_id uuid NOT NULL,
  is_default boolean DEFAULT false,
  icon text,
  CONSTRAINT boards_pkey PRIMARY KEY (id),
  CONSTRAINT boards_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.google_calendar_tokens (
  id uuid NOT NULL,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  scope text NOT NULL DEFAULT 'https://www.googleapis.com/auth/calendar'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT google_calendar_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT google_calendar_tokens_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  first_name text,
  last_name text,
  avatar_url text,
  timezone text DEFAULT 'UTC'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.recurring_instances (
  id bigint NOT NULL DEFAULT nextval('recurring_instances_id_seq'::regclass),
  original_task_id bigint NOT NULL,
  instance_date date NOT NULL,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  user_id uuid NOT NULL,
  CONSTRAINT recurring_instances_pkey PRIMARY KEY (id),
  CONSTRAINT recurring_instances_original_task_id_fkey FOREIGN KEY (original_task_id) REFERENCES public.tasks(id),
  CONSTRAINT recurring_instances_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.sprints (
  id bigint NOT NULL DEFAULT nextval('sprints_id_seq'::regclass),
  task_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone,
  total_estimated_time integer NOT NULL,
  actual_time integer,
  is_active boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  user_id uuid,
  CONSTRAINT sprints_pkey PRIMARY KEY (id),
  CONSTRAINT sprints_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.subtasks (
  id bigint NOT NULL DEFAULT nextval('subtasks_id_seq'::regclass),
  parent_task_id bigint NOT NULL,
  title text NOT NULL,
  description text,
  is_completed boolean DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  time_estimate integer DEFAULT 15,
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  user_id uuid NOT NULL,
  CONSTRAINT subtasks_pkey PRIMARY KEY (id),
  CONSTRAINT subtasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT subtasks_parent_task_id_fkey FOREIGN KEY (parent_task_id) REFERENCES public.tasks(id)
);
CREATE TABLE public.tasks (
  id bigint NOT NULL DEFAULT nextval('tasks_id_seq'::regclass),
  title text NOT NULL,
  description text,
  time_estimate integer NOT NULL DEFAULT 30,
  status text NOT NULL DEFAULT 'backlog'::text,
  position integer NOT NULL DEFAULT 0,
  scheduled_date timestamp with time zone,
  tags jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  user_id uuid,
  board_id bigint,
  priority integer DEFAULT 2 CHECK (priority >= 1 AND priority <= 4),
  due_date timestamp with time zone,
  start_date timestamp with time zone,
  effort_estimate integer DEFAULT 2 CHECK (effort_estimate >= 1 AND effort_estimate <= 4),
  impact_estimate integer DEFAULT 2 CHECK (impact_estimate >= 1 AND impact_estimate <= 4),
  category text,
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  time_spent integer DEFAULT 0,
  assignee_id uuid,
  parent_task_id bigint,
  recurring_interval integer DEFAULT 1 CHECK (recurring_interval >= 1),
  recurring_end_date timestamp with time zone,
  recurring_days_of_week ARRAY DEFAULT '{}'::integer[],
  recurring_days_of_month ARRAY DEFAULT '{}'::integer[],
  recurring_months_of_year ARRAY DEFAULT '{}'::integer[],
  google_calendar_event_id text,
  google_calendar_synced boolean DEFAULT false,
  recurring_pattern text,
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES auth.users(id),
  CONSTRAINT tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT tasks_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.boards(id),
  CONSTRAINT tasks_parent_task_id_fkey FOREIGN KEY (parent_task_id) REFERENCES public.tasks(id)
);
CREATE TABLE public.user_preferences (
  id uuid NOT NULL,
  theme text DEFAULT 'system'::text CHECK (theme = ANY (ARRAY['light'::text, 'dark'::text, 'system'::text])),
  language text DEFAULT 'en'::text,
  date_format text DEFAULT 'MM/DD/YYYY'::text CHECK (date_format = ANY (ARRAY['MM/DD/YYYY'::text, 'DD/MM/YYYY'::text, 'YYYY-MM-DD'::text])),
  time_format text DEFAULT '12h'::text CHECK (time_format = ANY (ARRAY['12h'::text, '24h'::text])),
  week_starts_on integer DEFAULT 0 CHECK (week_starts_on = ANY (ARRAY[0, 1])),
  auto_save boolean DEFAULT true,
  show_completed_tasks boolean DEFAULT false,
  task_sort_by text DEFAULT 'priority'::text CHECK (task_sort_by = ANY (ARRAY['priority'::text, 'dueDate'::text, 'created'::text, 'alphabetical'::text])),
  task_sort_order text DEFAULT 'asc'::text CHECK (task_sort_order = ANY (ARRAY['asc'::text, 'desc'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  calendar_default_zoom integer DEFAULT 1 CHECK (calendar_default_zoom >= 0 AND calendar_default_zoom <= 3),
  calendar_default_view text DEFAULT '3-day'::text CHECK (calendar_default_view = ANY (ARRAY['3-day'::text, 'week'::text])),
  board_default_view text DEFAULT 'compact'::text CHECK (board_default_view = ANY (ARRAY['grid'::text, 'compact'::text, 'list'::text])),
  google_calendar_enabled boolean DEFAULT false,
  google_calendar_selected_calendar text,
  google_calendar_auto_sync boolean DEFAULT false,
  google_calendar_sync_only_scheduled boolean DEFAULT false,
  auto_schedule_enabled boolean DEFAULT false,
  working_hours_monday_start text DEFAULT '09:00'::text,
  working_hours_monday_end text DEFAULT '17:00'::text,
  working_hours_monday_enabled boolean DEFAULT true,
  working_hours_tuesday_start text DEFAULT '09:00'::text,
  working_hours_tuesday_end text DEFAULT '17:00'::text,
  working_hours_tuesday_enabled boolean DEFAULT true,
  working_hours_wednesday_start text DEFAULT '09:00'::text,
  working_hours_wednesday_end text DEFAULT '17:00'::text,
  working_hours_wednesday_enabled boolean DEFAULT true,
  working_hours_thursday_start text DEFAULT '09:00'::text,
  working_hours_thursday_end text DEFAULT '17:00'::text,
  working_hours_thursday_enabled boolean DEFAULT true,
  working_hours_friday_start text DEFAULT '09:00'::text,
  working_hours_friday_end text DEFAULT '17:00'::text,
  working_hours_friday_enabled boolean DEFAULT true,
  working_hours_saturday_start text DEFAULT '10:00'::text,
  working_hours_saturday_end text DEFAULT '15:00'::text,
  working_hours_saturday_enabled boolean DEFAULT false,
  working_hours_sunday_start text DEFAULT '10:00'::text,
  working_hours_sunday_end text DEFAULT '15:00'::text,
  working_hours_sunday_enabled boolean DEFAULT false,
  buffer_time_between_tasks integer DEFAULT 15 CHECK (buffer_time_between_tasks >= 0 AND buffer_time_between_tasks <= 120),
  max_task_chunk_size integer DEFAULT 120 CHECK (max_task_chunk_size >= 30 AND max_task_chunk_size <= 480),
  min_task_chunk_size integer DEFAULT 30 CHECK (min_task_chunk_size >= 15 AND min_task_chunk_size <= 120),
  allow_overtime_scheduling boolean DEFAULT false,
  scheduling_lookahead_days integer DEFAULT 14 CHECK (scheduling_lookahead_days >= 1 AND scheduling_lookahead_days <= 90),
  ai_suggestion_preference text DEFAULT 'balanced'::text CHECK (ai_suggestion_preference = ANY (ARRAY['conservative'::text, 'balanced'::text, 'aggressive'::text])),
  respect_calendar_events boolean DEFAULT true,
  auto_reschedule_on_conflict boolean DEFAULT false,
  energy_peak_hours jsonb DEFAULT '[]'::jsonb,
  deep_work_time_slots jsonb DEFAULT '[]'::jsonb,
  deadline_buffer_days integer DEFAULT 1 CHECK (deadline_buffer_days >= 0 AND deadline_buffer_days <= 7),
  priority_boost_for_overdue boolean DEFAULT true,
  max_daily_work_hours numeric DEFAULT 8.0 CHECK (max_daily_work_hours >= 1.0 AND max_daily_work_hours <= 16.0),
  focus_time_minimum_minutes integer DEFAULT 90 CHECK (focus_time_minimum_minutes >= 30 AND focus_time_minimum_minutes <= 240),
  context_switch_penalty_minutes integer DEFAULT 10 CHECK (context_switch_penalty_minutes >= 0 AND context_switch_penalty_minutes <= 60),
  CONSTRAINT user_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT user_preferences_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);