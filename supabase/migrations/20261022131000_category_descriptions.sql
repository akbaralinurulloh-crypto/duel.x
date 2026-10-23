-- Duel.X AI — migration 0003: descriptions for the initial categories.
-- Only fills descriptions that are still empty, so later admin edits survive.
update public.categories set description = case slug
  when 'prompt-engineering'  then 'Write prompts that get reliable, high-quality results from AI models.'
  when 'ai-automation'       then 'Connect AI to tools and data to automate real multi-step work.'
  when 'data-analysis'       then 'Turn raw data into verified answers and clear findings with AI.'
  when 'ai-content-creation' then 'Produce writing, visuals and media with AI that meets a real brief.'
  when 'ai-assisted-coding'  then 'Build, debug and ship working software with AI as your pair programmer.'
  when 'ai-for-business'     then 'Apply AI to practical business problems and show measurable results.'
end
where description is null
  and slug in ('prompt-engineering', 'ai-automation', 'data-analysis',
               'ai-content-creation', 'ai-assisted-coding', 'ai-for-business');
