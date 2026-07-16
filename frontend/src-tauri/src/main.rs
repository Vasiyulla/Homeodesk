// Homeopathy Case Manager — Main executable entry point

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    homeopathy_case_manager_lib::run()
}
