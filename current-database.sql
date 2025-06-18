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
  recurring_pattern USER-DEFINED,
  recurring_interval integer DEFAULT 1 CHECK (recurring_interval >= 1),
  recurring_end_date timestamp with time zone,
  recurring_days_of_week ARRAY DEFAULT '{}'::integer[],
  recurring_days_of_month ARRAY DEFAULT '{}'::integer[],
  recurring_months_of_year ARRAY DEFAULT '{}'::integer[],
  google_calendar_event_id text,
  google_calendar_synced boolean DEFAULT false,
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_parent_task_id_fkey FOREIGN KEY (parent_task_id) REFERENCES public.tasks(id),
  CONSTRAINT tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES auth.users(id),
  CONSTRAINT tasks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT tasks_board_id_fkey FOREIGN KEY (board_id) REFERENCES public.boards(id)
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
  CONSTRAINT user_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT user_preferences_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);